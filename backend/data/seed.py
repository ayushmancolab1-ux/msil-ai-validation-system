#!/usr/bin/env python3
"""
Seed script - generates synthetic data and populates SQLite database.
Run: python data/seed.py
Idempotent - safe to run multiple times.
"""
import sys
import json
import random
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

# Add backend root to path so we can import database/models
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine, SessionLocal, Base
from models import ValidationRun, Deviation, AuditLog, MonthlyTrend

Base.metadata.create_all(bind=engine)

DRAWINGS_DIR = Path(__file__).parent / "drawings"
WIS_DIR = Path(__file__).parent / "wis"
DRAWINGS_DIR.mkdir(exist_ok=True)
WIS_DIR.mkdir(exist_ok=True)

VEHICLES = {
    "Maruti Swift": {
        "variants": ["LXI", "VXI", "ZXI"],
        "plants": ["Manesar", "Gurugram"],
        "code": "SW"
    },
    "Maruti Brezza": {
        "variants": ["VXI", "ZXI+", "Alpha"],
        "plants": ["Manesar", "Gujarat"],
        "code": "BR"
    },
    "Maruti Dzire": {
        "variants": ["LXI", "VXI", "ZXI"],
        "plants": ["Gurugram", "Gujarat"],
        "code": "DZ"
    }
}

COMPONENTS = [
    ("Engine Mount Bracket (Front LH)", "engine_mount", "ENG-MNT"),
    ("Brake Caliper Bolt Assembly", "brake_caliper", "BRK-CAL"),
    ("Suspension Strut Upper Mount", "suspension_strut", "SUS-STR"),
    ("Steering Rack Mounting Bracket", "steering_rack", "STR-RCK"),
    ("Fuel Tank Strap Assembly", "fuel_tank", "FUL-TNK"),
    ("Exhaust Manifold Stud", "exhaust_manifold", "EXH-MAN"),
    ("Wheel Hub Bearing", "wheel_hub", "WHL-HUB"),
    ("Gearbox Crossmember", "gearbox", "GBX-CRS"),
]

# Base drawing data for each component (ground-truth / master values)
COMPONENT_BASE = {
    "engine_mount": {
        "bore_diameter_mm": 42.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 185.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 210.0, "overall_height_mm": 115.0,
        "Ra_value": 1.6, "treatment": "Phosphate + Paint",
        "primary_torque_nm": 42.0, "fastener_grade": "8.8", "fastener_size": "M10",
        "torque_sequence": "cross-pattern", "re_torque_required": False,
        "material_grade": "IS 2062 Gr. B", "heat_treatment": "NIL", "thickness_mm": 6.0,
        "flatness_tolerance_mm": 0.10, "parallelism_tolerance_mm": 0.10,
        "true_position_dia_mm": 0.08, "datum_references": ["A", "B", "C"],
        "operation_step": 1, "sub_assembly_order": 1, "tooling_reference": "TL-ENG-001-NEW"
    },
    "brake_caliper": {
        "bore_diameter_mm": 54.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 95.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 155.0, "overall_height_mm": 88.0,
        "Ra_value": 1.6, "treatment": "Zinc Phosphate",
        "primary_torque_nm": 65.0, "fastener_grade": "10.9", "fastener_size": "M12",
        "torque_sequence": "cross-pattern", "re_torque_required": True,
        "material_grade": "IS 1570 Gr. C45", "heat_treatment": "Induction Hardened", "thickness_mm": 8.0,
        "flatness_tolerance_mm": 0.10, "parallelism_tolerance_mm": 0.08,
        "true_position_dia_mm": 0.08, "datum_references": ["A", "B"],
        "operation_step": 3, "sub_assembly_order": 2, "tooling_reference": "TL-BRK-001-NEW"
    },
    "suspension_strut": {
        "bore_diameter_mm": 50.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 320.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 175.0, "overall_height_mm": 380.0,
        "Ra_value": 1.6, "treatment": "E-coat + Paint",
        "primary_torque_nm": 55.0, "fastener_grade": "10.9", "fastener_size": "M14",
        "torque_sequence": "sequential", "re_torque_required": True,
        "material_grade": "IS 2062 Gr. E250", "heat_treatment": "NIL", "thickness_mm": 5.0,
        "flatness_tolerance_mm": 0.10, "parallelism_tolerance_mm": 0.12,
        "true_position_dia_mm": 0.08, "datum_references": ["A", "B", "C"],
        "operation_step": 5, "sub_assembly_order": 3, "tooling_reference": "TL-SUS-001-NEW"
    },
    "steering_rack": {
        "bore_diameter_mm": 38.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 145.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 195.0, "overall_height_mm": 72.0,
        "Ra_value": 1.6, "treatment": "Zinc Plate",
        "primary_torque_nm": 75.0, "fastener_grade": "10.9", "fastener_size": "M12",
        "torque_sequence": "cross-pattern", "re_torque_required": True,
        "material_grade": "IS 2062 Gr. B", "heat_treatment": "NIL", "thickness_mm": 7.0,
        "flatness_tolerance_mm": 0.10, "parallelism_tolerance_mm": 0.10,
        "true_position_dia_mm": 0.08, "datum_references": ["A", "B"],
        "operation_step": 4, "sub_assembly_order": 2, "tooling_reference": "TL-STR-001-NEW"
    },
    "fuel_tank": {
        "bore_diameter_mm": 28.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 420.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 580.0, "overall_height_mm": 195.0,
        "Ra_value": 3.2, "treatment": "Seam Weld + Paint",
        "primary_torque_nm": 22.0, "fastener_grade": "8.8", "fastener_size": "M8",
        "torque_sequence": "sequential", "re_torque_required": False,
        "material_grade": "IS 513 Gr. D", "heat_treatment": "NIL", "thickness_mm": 1.2,
        "flatness_tolerance_mm": 0.20, "parallelism_tolerance_mm": 0.20,
        "true_position_dia_mm": 0.12, "datum_references": ["A", "B"],
        "operation_step": 8, "sub_assembly_order": 5, "tooling_reference": "TL-FUL-001-NEW"
    },
    "exhaust_manifold": {
        "bore_diameter_mm": 45.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 78.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 285.0, "overall_height_mm": 145.0,
        "Ra_value": 3.2, "treatment": "NIL",
        "primary_torque_nm": 28.0, "fastener_grade": "8.8", "fastener_size": "M10",
        "torque_sequence": "sequential", "re_torque_required": True,
        "material_grade": "IS 1865 Grade SG 400/12", "heat_treatment": "NIL", "thickness_mm": 12.0,
        "flatness_tolerance_mm": 0.15, "parallelism_tolerance_mm": 0.15,
        "true_position_dia_mm": 0.10, "datum_references": ["A", "B", "C"],
        "operation_step": 6, "sub_assembly_order": 4, "tooling_reference": "TL-EXH-001-NEW"
    },
    "wheel_hub": {
        "bore_diameter_mm": 72.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 62.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 135.0, "overall_height_mm": 135.0,
        "Ra_value": 1.6, "treatment": "Zinc Phosphate + Oil",
        "primary_torque_nm": 160.0, "fastener_grade": "10.9", "fastener_size": "M20",
        "torque_sequence": "cross-pattern", "re_torque_required": True,
        "material_grade": "IS 2708 Gr. 1", "heat_treatment": "Through Hardened", "thickness_mm": 15.0,
        "flatness_tolerance_mm": 0.08, "parallelism_tolerance_mm": 0.08,
        "true_position_dia_mm": 0.08, "datum_references": ["A", "B", "C", "D"],
        "operation_step": 7, "sub_assembly_order": 4, "tooling_reference": "TL-WHL-001-NEW"
    },
    "gearbox": {
        "bore_diameter_mm": 60.0, "bore_tolerance_mm": 0.02, "shaft_length_mm": 165.0,
        "gap_tolerance_mm": 0.15, "overall_width_mm": 245.0, "overall_height_mm": 125.0,
        "Ra_value": 1.6, "treatment": "Phosphate + Paint",
        "primary_torque_nm": 85.0, "fastener_grade": "10.9", "fastener_size": "M14",
        "torque_sequence": "sequential", "re_torque_required": False,
        "material_grade": "IS 2062 Gr. B", "heat_treatment": "NIL", "thickness_mm": 8.0,
        "flatness_tolerance_mm": 0.12, "parallelism_tolerance_mm": 0.12,
        "true_position_dia_mm": 0.08, "datum_references": ["A", "B"],
        "operation_step": 9, "sub_assembly_order": 6, "tooling_reference": "TL-GBX-001-NEW"
    }
}

# -----------------------------------------------------------------------
# Deliberate deviations: (vehicle, plant, component) -> {field: wis_value}
# Multiple entries for the same key are MERGED using defaultdict.
# -----------------------------------------------------------------------
_RAW_DEVIATIONS = [
    # CRITICAL - torque errors
    (("Maruti Swift", "Manesar", "Brake Caliper Bolt Assembly"), {"primary_torque_nm": 45.0}),
    (("Maruti Brezza", "Gujarat", "Brake Caliper Bolt Assembly"), {"primary_torque_nm": 48.0}),
    (("Maruti Dzire", "Gurugram", "Suspension Strut Upper Mount"), {"primary_torque_nm": 30.0}),
    (("Maruti Swift", "Gurugram", "Wheel Hub Bearing"), {"primary_torque_nm": 120.0}),
    (("Maruti Brezza", "Manesar", "Steering Rack Mounting Bracket"), {"primary_torque_nm": 50.0}),
    (("Maruti Dzire", "Gujarat", "Exhaust Manifold Stud"), {"primary_torque_nm": 18.0}),

    # HIGH - bore tolerance
    (("Maruti Swift", "Manesar", "Engine Mount Bracket (Front LH)"), {"bore_tolerance_mm": 0.05}),
    (("Maruti Brezza", "Manesar", "Fuel Tank Strap Assembly"), {"bore_tolerance_mm": 0.05}),
    (("Maruti Dzire", "Gurugram", "Gearbox Crossmember"), {"bore_tolerance_mm": 0.05}),
    (("Maruti Swift", "Gurugram", "Suspension Strut Upper Mount"), {"bore_tolerance_mm": 0.05}),

    # HIGH - gap tolerance
    (("Maruti Brezza", "Gujarat", "Steering Rack Mounting Bracket"), {"gap_tolerance_mm": 0.30}),
    (("Maruti Dzire", "Gujarat", "Wheel Hub Bearing"), {"gap_tolerance_mm": 0.30}),
    (("Maruti Swift", "Manesar", "Exhaust Manifold Stud"), {"gap_tolerance_mm": 0.30}),
    (("Maruti Brezza", "Manesar", "Gearbox Crossmember"), {"gap_tolerance_mm": 0.30}),

    # HIGH - true position
    (("Maruti Dzire", "Gurugram", "Brake Caliper Bolt Assembly"), {"true_position_dia_mm": 0.15}),
    (("Maruti Swift", "Gurugram", "Engine Mount Bracket (Front LH)"), {"true_position_dia_mm": 0.15, "primary_torque_nm": 38.0}),
    (("Maruti Brezza", "Gujarat", "Fuel Tank Strap Assembly"), {"true_position_dia_mm": 0.15}),
    (("Maruti Dzire", "Gujarat", "Gearbox Crossmember"), {"true_position_dia_mm": 0.15}),

    # MEDIUM - Ra value
    (("Maruti Swift", "Manesar", "Suspension Strut Upper Mount"), {"Ra_value": 3.2}),
    (("Maruti Brezza", "Manesar", "Brake Caliper Bolt Assembly"), {"Ra_value": 3.2}),
    (("Maruti Dzire", "Gurugram", "Engine Mount Bracket (Front LH)"), {"Ra_value": 3.2}),
    (("Maruti Swift", "Gurugram", "Steering Rack Mounting Bracket"), {"Ra_value": 3.2}),
    (("Maruti Brezza", "Gujarat", "Suspension Strut Upper Mount"), {"Ra_value": 3.2}),
    (("Maruti Dzire", "Gujarat", "Brake Caliper Bolt Assembly"), {"Ra_value": 3.2}),

    # MEDIUM - flatness tolerance
    (("Maruti Swift", "Manesar", "Steering Rack Mounting Bracket"), {"flatness_tolerance_mm": 0.20}),
    (("Maruti Brezza", "Manesar", "Exhaust Manifold Stud"), {"flatness_tolerance_mm": 0.20}),
    (("Maruti Dzire", "Gurugram", "Fuel Tank Strap Assembly"), {"flatness_tolerance_mm": 0.35}),
    (("Maruti Swift", "Gurugram", "Gearbox Crossmember"), {"flatness_tolerance_mm": 0.20}),
    (("Maruti Brezza", "Gujarat", "Engine Mount Bracket (Front LH)"), {"flatness_tolerance_mm": 0.20}),
    (("Maruti Dzire", "Gujarat", "Steering Rack Mounting Bracket"), {"flatness_tolerance_mm": 0.20}),

    # MEDIUM - parallelism
    (("Maruti Swift", "Manesar", "Wheel Hub Bearing"), {"parallelism_tolerance_mm": 0.25}),
    (("Maruti Brezza", "Manesar", "Suspension Strut Upper Mount"), {"parallelism_tolerance_mm": 0.25}),
    (("Maruti Dzire", "Gurugram", "Steering Rack Mounting Bracket"), {"parallelism_tolerance_mm": 0.25}),
    (("Maruti Swift", "Gurugram", "Brake Caliper Bolt Assembly"), {"parallelism_tolerance_mm": 0.25}),
    (("Maruti Brezza", "Gujarat", "Wheel Hub Bearing"), {"parallelism_tolerance_mm": 0.25}),
    (("Maruti Dzire", "Gujarat", "Suspension Strut Upper Mount"), {"parallelism_tolerance_mm": 0.25}),

    # LOW - revision mismatches
    (("Maruti Swift", "Manesar", "Fuel Tank Strap Assembly"), {"drawing_revision": "B"}),
    (("Maruti Swift", "Gurugram", "Fuel Tank Strap Assembly"), {"drawing_revision": "B"}),
    (("Maruti Brezza", "Manesar", "Engine Mount Bracket (Front LH)"), {"drawing_revision": "B"}),
    (("Maruti Brezza", "Gujarat", "Engine Mount Bracket (Front LH)"), {"drawing_revision": "B"}),
    (("Maruti Dzire", "Gurugram", "Exhaust Manifold Stud"), {"drawing_revision": "B"}),
    (("Maruti Dzire", "Gujarat", "Wheel Hub Bearing"), {"drawing_revision": "B"}),
    (("Maruti Swift", "Manesar", "Gearbox Crossmember"), {"drawing_revision": "B"}),
    (("Maruti Swift", "Gurugram", "Exhaust Manifold Stud"), {"drawing_revision": "B"}),
    (("Maruti Brezza", "Manesar", "Wheel Hub Bearing"), {"drawing_revision": "B"}),
    (("Maruti Brezza", "Gujarat", "Gearbox Crossmember"), {"drawing_revision": "B"}),
    (("Maruti Dzire", "Gurugram", "Fuel Tank Strap Assembly"), {"drawing_revision": "B"}),
    (("Maruti Dzire", "Gujarat", "Engine Mount Bracket (Front LH)"), {"drawing_revision": "B"}),

    # LOW - tooling reference mismatches
    (("Maruti Swift", "Manesar", "Brake Caliper Bolt Assembly"), {"tooling_reference": "TL-BRK-001-OLD"}),
    (("Maruti Brezza", "Manesar", "Steering Rack Mounting Bracket"), {"tooling_reference": "TL-STR-001-OLD"}),
    (("Maruti Dzire", "Gurugram", "Wheel Hub Bearing"), {"tooling_reference": "TL-WHL-001-OLD"}),
    (("Maruti Swift", "Gurugram", "Gearbox Crossmember"), {"tooling_reference": "TL-GBX-001-OLD"}),
    (("Maruti Brezza", "Gujarat", "Exhaust Manifold Stud"), {"tooling_reference": "TL-EXH-001-OLD"}),
    (("Maruti Dzire", "Gujarat", "Fuel Tank Strap Assembly"), {"tooling_reference": "TL-FUL-001-OLD"}),
]

# Build merged DELIBERATE_DEVIATIONS: same key entries are merged (fields combined)
DELIBERATE_DEVIATIONS: dict = defaultdict(dict)
for key, fields in _RAW_DEVIATIONS:
    DELIBERATE_DEVIATIONS[key].update(fields)
# Convert back to a plain dict for clarity
DELIBERATE_DEVIATIONS = dict(DELIBERATE_DEVIATIONS)


def make_drawing(vehicle_name, vehicle_code, plant, variant, comp_name, comp_key, comp_code, idx):
    base = dict(COMPONENT_BASE[comp_key])
    drawing_num = f"MSIL-DE-{vehicle_code}-{1000 + idx:04d}-C"
    part_num = f"{vehicle_code}-{comp_code}-{100 + idx:03d}-C"
    return {
        "drawing_number": drawing_num,
        "drawing_revision": "C",
        "part_number": part_num,
        "part_description": f"{comp_name} for {vehicle_name} {variant}",
        "vehicle_model": vehicle_name,
        "vehicle_variant": variant,
        "plant": plant,
        "component": comp_name,
        **base
    }


def make_wis(drawing, vehicle_name, plant, comp_key, comp_name):
    """Create WIS from drawing, injecting deliberate deviations where specified."""
    wis = dict(drawing)
    key = (vehicle_name, plant, comp_name)
    if key in DELIBERATE_DEVIATIONS:
        for field, wis_val in DELIBERATE_DEVIATIONS[key].items():
            wis[field] = wis_val
    return wis


def generate_json_files():
    idx = 0
    for vehicle_name, v_info in VEHICLES.items():
        vehicle_code = v_info["code"]
        for plant in v_info["plants"]:
            variant = v_info["variants"][0]  # use first variant for seed
            for comp_idx, (comp_name, comp_key, comp_code) in enumerate(COMPONENTS):
                idx += 1
                drawing = make_drawing(
                    vehicle_name, vehicle_code, plant, variant,
                    comp_name, comp_key, comp_code, idx
                )
                wis = make_wis(drawing, vehicle_name, plant, comp_key, comp_name)

                # Save files using a consistent naming convention
                safe_vehicle = vehicle_name.replace(" ", "_").lower()
                filename = f"{safe_vehicle}_{plant.lower()}_{comp_key}.json"

                drawing_path = DRAWINGS_DIR / filename
                wis_path = WIS_DIR / filename

                with open(drawing_path, "w") as f:
                    json.dump(drawing, f, indent=2)
                with open(wis_path, "w") as f:
                    json.dump(wis, f, indent=2)

    print(f"Generated {idx} drawing+WIS JSON pairs")


def seed_validation_runs(db):
    """Seed historical validation runs with deviations."""
    from engine.comparator import compare_fields
    from engine.scorer import get_cost_impact

    # Idempotency check
    existing = db.query(ValidationRun).count()
    if existing > 0:
        print(f"Found {existing} existing validation runs, skipping run seeding.")
        return

    run_date = datetime.now() - timedelta(days=365)

    for vehicle_name, v_info in VEHICLES.items():
        vehicle_code = v_info["code"]
        for plant in v_info["plants"]:
            variant = v_info["variants"][0]

            safe_vehicle = vehicle_name.replace(" ", "_").lower()

            # Load all component deviations for this vehicle+plant combo
            all_deviations = []
            total_params = 0
            matched = 0

            for comp_name, comp_key, comp_code in COMPONENTS:
                # Use the per-plant seeded JSON files
                filename = f"{safe_vehicle}_{plant.lower()}_{comp_key}.json"
                drawing_path = DRAWINGS_DIR / filename
                wis_path = WIS_DIR / filename

                if not drawing_path.exists():
                    continue

                with open(drawing_path) as f:
                    drawing = json.load(f)
                with open(wis_path) as f:
                    wis = json.load(f)

                devs = compare_fields(drawing, wis, vehicle_name, comp_name)
                all_deviations.extend([(comp_name, d) for d in devs])

                # Approx 20 comparable fields per component
                total_params += 20
                matched += max(0, 20 - len(devs))

            critical_count = sum(1 for _, d in all_deviations if d.severity == "Critical")
            high_count = sum(1 for _, d in all_deviations if d.severity == "High")
            medium_count = sum(1 for _, d in all_deviations if d.severity == "Medium")
            low_count = sum(1 for _, d in all_deviations if d.severity == "Low")

            run = ValidationRun(
                vehicle_model=vehicle_name,
                plant=plant,
                component="All Components",
                run_timestamp=run_date + timedelta(days=random.randint(0, 30)),
                drawing_filename=f"{safe_vehicle}_{plant.lower()}_drawings.pdf",
                wis_filename=f"{safe_vehicle}_{plant.lower()}_wis.pdf",
                status="complete",
                total_params=total_params,
                matched=matched,
                critical_count=critical_count,
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
            )
            db.add(run)
            db.flush()

            for comp_name, d in all_deviations:
                dev = Deviation(
                    run_id=run.id,
                    component=comp_name,
                    field_name=d.field_name,
                    drawing_value=str(d.drawing_value),
                    wis_value=str(d.wis_value),
                    deviation_magnitude=d.deviation_magnitude,
                    severity=d.severity,
                    cost_impact_inr=get_cost_impact(d.severity),
                    recommendation=d.recommendation,
                    is_acknowledged=False,
                )
                db.add(dev)

            db.add(AuditLog(
                run_id=run.id,
                event_type="validation_complete",
                event_detail=(
                    f"Validation completed: {critical_count} critical, "
                    f"{high_count} high, {medium_count} medium, {low_count} low deviations"
                ),
                user="seed_script",
            ))

            run_date += timedelta(days=7)

    db.commit()
    print("Seeded validation runs and deviations.")


def seed_monthly_trends(db):
    """Seed monthly trend data."""
    existing = db.query(MonthlyTrend).count()
    if existing > 0:
        print(f"Found {existing} monthly trend records, skipping.")
        return

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    deviation_counts = [48, 46, 50, 35, 38, 30, 22, 18, 24, 10, 8, 12]
    detection_days = [18, 16, 14, 10, 7, 5, 3, 2, 1, 1, 1, 1]

    for i, (month, count, det_days) in enumerate(zip(months, deviation_counts, detection_days)):
        cost = count * random.randint(15000, 45000)
        trend = MonthlyTrend(
            month_label=month,
            month_index=i + 1,
            deviation_count=count,
            rework_cost_inr=cost,
            detection_time_days=det_days,
            without_ai_count=47,  # flat baseline
        )
        db.add(trend)

    db.commit()
    print("Seeded monthly trend data.")


if __name__ == "__main__":
    random.seed(42)

    print("Generating JSON files...")
    generate_json_files()

    print("Seeding database...")
    db = SessionLocal()
    try:
        seed_validation_runs(db)
        seed_monthly_trends(db)
    finally:
        db.close()

    print("Seed complete!")
