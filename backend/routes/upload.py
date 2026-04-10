import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
import aiofiles

from schemas import UploadResponse

router = APIRouter()

BACKEND_DIR = Path(__file__).parent.parent
DRAWINGS_DIR = BACKEND_DIR / "uploads" / "drawings"
WIS_DIR = BACKEND_DIR / "uploads" / "wis"

# Drawings: accept images (for LLM vision) AND classic PDF/DOCX
ALLOWED_DRAWING_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp"}
# WIS: text-based documents only
ALLOWED_WIS_EXTENSIONS = {".pdf", ".docx", ".doc"}


def _validate_drawing_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_DRAWING_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid file type '{ext}' for Assembly Drawing. "
                "Accepted: PNG, JPG, JPEG, WEBP (images) or PDF, DOCX (documents)."
            ),
        )
    return ext


def _validate_wis_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_WIS_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}' for WIS. Accepted: PDF, DOCX.",
        )
    return ext


async def _save_file(upload_file: UploadFile, dest_dir: Path, ext: str) -> UploadResponse:
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    dest_path = dest_dir / safe_filename

    try:
        contents = await upload_file.read()
        async with aiofiles.open(dest_path, "wb") as f:
            await f.write(contents)
        size_bytes = len(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    return UploadResponse(
        file_id=file_id,
        filename=upload_file.filename,
        size_bytes=size_bytes,
    )


@router.post("/drawing", response_model=UploadResponse)
async def upload_drawing(file: UploadFile = File(...)):
    """Upload an engineering drawing — image (PNG/JPG/WEBP) or document (PDF/DOCX)."""
    try:
        ext = _validate_drawing_extension(file.filename)
        return await _save_file(file, DRAWINGS_DIR, ext)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/wis", response_model=UploadResponse)
async def upload_wis(file: UploadFile = File(...)):
    """Upload a Work Instruction Sheet (PDF or DOCX)."""
    try:
        ext = _validate_wis_extension(file.filename)
        return await _save_file(file, WIS_DIR, ext)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
