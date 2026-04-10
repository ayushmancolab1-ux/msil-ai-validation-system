from dataclasses import dataclass
from typing import Any, Optional, List

from .rule_engine import get_thresholds, is_safety_critical


@dataclass
class DeviationResult:
    field_name: str
    drawing_value: Any
    wis_value: Any
    deviation_magnitude: Optional[float]
    severity: str
    description: str
    recommendation: str
    component: str


NUMERIC_FIELDS = [
    "bore_diameter_mm", "bore_tolerance_mm", "shaft_length_mm",
    "gap_tolerance_mm", "overall_width_mm", "overall_height_mm",
    "Ra_value", "primary_torque_nm", "thickness_mm",
    "flatness_tolerance_mm", "parallelism_tolerance_mm", "true_position_dia_mm"
]

STRING_FIELDS = [
    "drawing_revision", "part_number", "drawing_number",
    "fastener_grade", "fastener_size", "torque_sequence",
    "material_grade", "heat_treatment", "treatment", "tooling_reference"
]

BOOL_FIELDS = ["re_torque_required"]


def compare_fields(
    drawing: dict,
    wis: dict,
    vehicle_model: str,
    component: str
) -> List[DeviationResult]:
    thresholds = get_thresholds(vehicle_model)
    safety_critical = is_safety_critical(component)
    deviations = []

    # --- Numeric field comparisons ---
    for field in NUMERIC_FIELDS:
        d_val = drawing.get(field)
        w_val = wis.get(field)
        if d_val is None or w_val is None:
            continue
        try:
            d_val = float(d_val)
            w_val = float(w_val)
        except (TypeError, ValueError):
            continue

        if abs(d_val - w_val) < 1e-9:
            continue

        magnitude = abs(d_val - w_val)
        severity = _score_numeric(
            field, d_val, w_val, magnitude, thresholds, safety_critical, component
        )
        if severity:
            deviations.append(DeviationResult(
                field_name=field,
                drawing_value=d_val,
                wis_value=w_val,
                deviation_magnitude=round(magnitude, 4),
                severity=severity,
                description=f"{field} mismatch: Drawing={d_val}, WIS={w_val}",
                recommendation=_get_recommendation(field, severity, d_val),
                component=component
            ))

    # --- String field comparisons ---
    for field in STRING_FIELDS:
        d_val = drawing.get(field)
        w_val = wis.get(field)
        if d_val is None or w_val is None:
            continue
        if str(d_val).strip().lower() == str(w_val).strip().lower():
            continue

        severity = _score_string(field, thresholds)
        deviations.append(DeviationResult(
            field_name=field,
            drawing_value=str(d_val),
            wis_value=str(w_val),
            deviation_magnitude=None,
            severity=severity,
            description=f"{field} mismatch: Drawing='{d_val}', WIS='{w_val}'",
            recommendation=_get_recommendation(field, severity, d_val),
            component=component
        ))

    # --- Boolean field comparisons ---
    for field in BOOL_FIELDS:
        d_val = drawing.get(field)
        w_val = wis.get(field)
        if d_val is None or w_val is None:
            continue
        if bool(d_val) == bool(w_val):
            continue
        deviations.append(DeviationResult(
            field_name=field,
            drawing_value=str(d_val),
            wis_value=str(w_val),
            deviation_magnitude=None,
            severity="Medium",
            description=f"{field} mismatch: Drawing={d_val}, WIS={w_val}",
            recommendation=f"Update WIS to reflect re-torque requirement: {d_val}",
            component=component
        ))

    return deviations


def _score_numeric(
    field: str,
    d_val: float,
    w_val: float,
    magnitude: float,
    thresholds: dict,
    safety_critical: bool,
    component: str
) -> Optional[str]:
    if field == "primary_torque_nm":
        if d_val == 0:
            return None
        pct = magnitude / d_val * 100
        if safety_critical and pct > 10:
            return "Critical"
        if pct > thresholds["torque_critical_pct"]:
            return "Critical"
        if pct > thresholds["torque_high_pct"]:
            return "High"
        return None  # within tolerance

    elif field == "bore_tolerance_mm":
        if magnitude > thresholds["bore_critical_mm"]:
            return "Critical"
        if magnitude > thresholds["bore_high_mm"]:
            return "High"
        return None

    elif field == "gap_tolerance_mm":
        if magnitude > thresholds["gap_critical_mm"]:
            return "Critical"
        if magnitude > thresholds["gap_high_mm"]:
            return "High"
        return None

    elif field == "Ra_value":
        if magnitude > thresholds["Ra_medium_threshold"]:
            return "Medium"
        return None

    elif field == "flatness_tolerance_mm":
        if magnitude > thresholds["flatness_medium_mm"]:
            return "Medium"
        return None

    elif field == "parallelism_tolerance_mm":
        if magnitude > thresholds["parallelism_medium_mm"]:
            return "Medium"
        return None

    elif field == "true_position_dia_mm":
        if magnitude > thresholds["true_position_high_mm"]:
            return "High"
        return None

    # For other numeric fields, flag if >5% difference
    if d_val != 0 and (magnitude / abs(d_val)) > 0.05:
        return "Medium"
    return None


def _score_string(field: str, thresholds: dict) -> str:
    if field in ["drawing_revision"]:
        return "Low"
    if field in ["part_number", "drawing_number"]:
        return "Low"
    if field in ["tooling_reference"]:
        return "Low"
    if field in ["fastener_grade", "fastener_size"]:
        return "High"
    return "Medium"


def _get_recommendation(field: str, severity: str, drawing_val: Any) -> str:
    recs = {
        "primary_torque_nm": (
            f"Update WIS torque specification to {drawing_val} Nm as per master drawing. "
            f"Stop production until corrected."
        ),
        "bore_tolerance_mm": (
            f"Update WIS bore tolerance to ±{drawing_val} mm. "
            f"Current WIS specification is outside drawing limits."
        ),
        "gap_tolerance_mm": (
            f"Correct WIS gap tolerance to ±{drawing_val} mm. Tighter control required."
        ),
        "Ra_value": (
            f"Update WIS surface finish specification to Ra {drawing_val}. "
            f"Machined faces require finer finish."
        ),
        "flatness_tolerance_mm": (
            f"Correct WIS flatness tolerance to {drawing_val} mm per drawing GD&T specification."
        ),
        "parallelism_tolerance_mm": (
            f"Update WIS parallelism tolerance to {drawing_val} mm as per drawing."
        ),
        "true_position_dia_mm": (
            f"Update WIS true position to ⌀{drawing_val} mm as per drawing GD&T callout."
        ),
        "drawing_revision": (
            f"Update WIS document header to reflect current revision '{drawing_val}'."
        ),
        "part_number": (
            f"Correct part number in WIS to '{drawing_val}' to match current drawing."
        ),
        "tooling_reference": (
            f"Update tooling reference in WIS to current tool code as per drawing."
        ),
        "fastener_grade": (
            f"Update fastener grade in WIS to '{drawing_val}' as per drawing specification."
        ),
        "fastener_size": (
            f"Update fastener size in WIS to '{drawing_val}' as per drawing specification."
        ),
    }
    return recs.get(field, f"Update WIS field '{field}' to match drawing value: {drawing_val}")
