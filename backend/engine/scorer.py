SEVERITY_COST = {
    "Critical": 45000,
    "High": 28000,
    "Medium": 12000,
    "Low": 4000
}

SEVERITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def get_cost_impact(severity: str) -> int:
    return SEVERITY_COST.get(severity, 4000)


def sort_by_severity(deviations: list) -> list:
    return sorted(
        deviations,
        key=lambda d: SEVERITY_ORDER.get(
            d.severity if hasattr(d, "severity") else d.get("severity", "Low"),
            3
        )
    )


def get_severity_order(severity: str) -> int:
    return SEVERITY_ORDER.get(severity, 3)
