"""
llm_agent.py
LLM-powered vision agent that extracts engineering specifications from
assembly drawing images using either Azure OpenAI (GPT-4.1) or OpenAI (GPT-4.1).
"""
import base64
import json
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Supported image extensions
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

_MIME_MAP = {
    ".jpg": "jpeg",
    ".jpeg": "jpeg",
    ".png": "png",
    ".webp": "webp",
}

_EXTRACTION_PROMPT = """You are an expert automotive engineering drawing analyzer for Maruti Suzuki India Limited (MSIL).

Carefully examine this assembly drawing image and extract ALL engineering specifications visible in it.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences — with exactly this structure:

{
  "drawing_number": "",
  "drawing_revision": "",
  "part_number": "",
  "part_description": "",
  "vehicle_model": "",
  "vehicle_variant": "",
  "plant": "",
  "component": "",
  "bore_diameter_mm": null,
  "bore_tolerance_mm": null,
  "shaft_length_mm": null,
  "gap_tolerance_mm": null,
  "overall_width_mm": null,
  "overall_height_mm": null,
  "Ra_value": null,
  "treatment": "",
  "primary_torque_nm": null,
  "fastener_grade": "",
  "fastener_size": "",
  "torque_sequence": "",
  "re_torque_required": false,
  "material_grade": "",
  "heat_treatment": "",
  "thickness_mm": null,
  "flatness_tolerance_mm": null,
  "parallelism_tolerance_mm": null,
  "true_position_dia_mm": null,
  "datum_references": [],
  "operation_step": null,
  "sub_assembly_order": null,
  "tooling_reference": ""
}

Extraction rules:
- drawing_number: Look for patterns like "MSIL-DE-SW-XXXX-C" or "DRG. NO." field in the title block.
- drawing_revision: Look for "REV" field in title block (single uppercase letter like A, B, C).
- part_number: Look in Bill of Materials table, "PART NO." column for the main bracket/assembly part.
- part_description: The component name from title block or BOM description column.
- vehicle_model: Look for model name (Swift / Brezza / Dzire / Vitara etc).
- bore_diameter_mm: Look for "ø" or "⌀" symbol followed by a number (e.g. ø64.00 → 64.0).
- bore_tolerance_mm: The ± value directly associated with the bore diameter (e.g. ±0.02 → 0.02).
- shaft_length_mm / gap_tolerance_mm: Extract if visible, otherwise null.
- overall_width_mm: The largest horizontal dimension shown (e.g. 300 in the front view).
- overall_height_mm: The largest vertical dimension shown (e.g. 180 in the front view).
- Ra_value: Surface finish value shown as "Ra X.X" or "√Ra X.X" (e.g. Ra 3.2 → 3.2). Use the most prominent Ra value if multiple exist.
- treatment: Surface treatment from General Notes (e.g. "Phosphate + Paint").
- primary_torque_nm: Look for "TORQUE:" or "Nm" — the fastener tightening torque value.
- fastener_grade: Look for grade like "8.8", "10.9" in BOM or notes.
- fastener_size: Look for "M10", "M12", etc. in notes or BOM.
- torque_sequence: e.g. "cross-pattern", "diagonal", "sequential".
- re_torque_required: true if the drawing mentions re-torque or re-check after assembly.
- material_grade: From General Notes, e.g. "IS 2062 Gr. B".
- heat_treatment: From General Notes, e.g. "NIL" or "Carburized".
- thickness_mm: Plate thickness, e.g. "t = 4.0" → 4.0.
- flatness_tolerance_mm: From GD&T frame with flatness symbol (□).
- parallelism_tolerance_mm: From GD&T frame with parallelism symbol (//).
- true_position_dia_mm: From GD&T frame with true position symbol (⊕) — the numeric value after ⌀.
- datum_references: List of datum labels used (e.g. ["A", "B", "C"]).
- tooling_reference: Any tooling or fixture code mentioned.

If a value is not visible or cannot be determined, use null for numbers, "" for strings, false for booleans, [] for arrays.
Do not guess — only extract what you can clearly read in the image."""


def _get_openai_client(provider: str):
    """Return the appropriate OpenAI client based on provider."""
    from openai import AzureOpenAI, OpenAI

    if provider == "azure":
        api_key = os.getenv("AZURE_OPENAI_API_KEY", "")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        if not api_key or not endpoint:
            raise ValueError("AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT must be set in .env")
        return AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint,
        )
    else:
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("OPENAI_API_KEY must be set in .env")
        return OpenAI(api_key=api_key)


def _get_model_name(provider: str) -> str:
    if provider == "azure":
        return os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
    return os.getenv("OPENAI_MODEL", "gpt-4.1")


def _encode_image(image_path: str) -> tuple[str, str]:
    """Return (base64_data, mime_type) for the image at image_path."""
    ext = Path(image_path).suffix.lower()
    mime = _MIME_MAP.get(ext, "jpeg")
    with open(image_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    return data, mime


def extract_drawing_from_image(image_path: str, provider: str = "openai") -> dict:
    """
    Use LLM vision to extract engineering specs from an assembly drawing image.

    Args:
        image_path: Absolute path to the image file.
        provider:   "openai" or "azure"

    Returns:
        Flat dict of extracted fields (matching the schema expected by comparator.py).
        Raises on LLM/API error — caller should catch and fall back to seeded data.
    """
    b64, mime = _encode_image(image_path)
    client = _get_openai_client(provider)
    model = _get_model_name(provider)

    logger.info("LLM extraction: provider=%s model=%s image=%s", provider, model, image_path)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/{mime};base64,{b64}",
                            "detail": "high",
                        },
                    },
                    {
                        "type": "text",
                        "text": _EXTRACTION_PROMPT,
                    },
                ],
            }
        ],
        max_tokens=2000,
        temperature=0,
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if the model wrapped the JSON
    if content.startswith("```"):
        lines = content.split("\n")
        # Drop first and last fence lines
        inner = [l for l in lines if not l.startswith("```")]
        content = "\n".join(inner).strip()

    extracted = json.loads(content)
    logger.info("LLM extraction succeeded: %d fields extracted", len(extracted))
    return extracted


def is_image_file(filename: str) -> bool:
    """Return True if the filename has an image extension."""
    return Path(filename).suffix.lower() in IMAGE_EXTENSIONS


def check_provider_configured(provider: str) -> bool:
    """Return True if the given provider has its required env vars set."""
    if provider == "azure":
        return bool(
            os.getenv("AZURE_OPENAI_API_KEY")
            and os.getenv("AZURE_OPENAI_ENDPOINT")
        )
    return bool(os.getenv("OPENAI_API_KEY"))
