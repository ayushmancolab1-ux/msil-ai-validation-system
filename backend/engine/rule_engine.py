# Tolerance thresholds per vehicle model
THRESHOLDS = {
    "default": {
        "torque_critical_pct": 15.0,
        "torque_high_pct": 5.0,
        "bore_critical_mm": 0.05,
        "bore_high_mm": 0.02,
        "gap_critical_mm": 0.20,
        "gap_high_mm": 0.10,
        "Ra_medium_threshold": 0.8,
        "flatness_medium_mm": 0.05,
        "parallelism_medium_mm": 0.05,
        "true_position_high_mm": 0.04,
    }
}

SAFETY_CRITICAL_COMPONENTS = [
    "Brake Caliper Bolt Assembly",
    "Suspension Strut Upper Mount",
    "Steering Rack Mounting Bracket",
    "Wheel Hub Bearing"
]


def get_thresholds(vehicle_model: str) -> dict:
    return THRESHOLDS.get(vehicle_model, THRESHOLDS["default"])


def is_safety_critical(component: str) -> bool:
    return any(sc in component for sc in SAFETY_CRITICAL_COMPONENTS)
