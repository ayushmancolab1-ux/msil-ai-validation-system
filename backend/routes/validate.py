from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models import ValidationRun, Deviation, AuditLog
from schemas import ValidationRunCreate, ValidationRunResponse, DeviationResponse
from engine.extractor import extract_fields
from engine.comparator import compare_fields
from engine.scorer import get_cost_impact

router = APIRouter()

BACKEND_DIR = Path(__file__).parent.parent
DRAWINGS_UPLOAD_DIR = BACKEND_DIR / "uploads" / "drawings"
WIS_UPLOAD_DIR = BACKEND_DIR / "uploads" / "wis"


def _find_uploaded_file(file_id: str, directory: Path) -> Optional[Path]:
    """Find a previously uploaded file by its UUID prefix."""
    for f in directory.iterdir():
        if f.stem == file_id or f.name.startswith(file_id):
            return f
    return None


def _run_validation_task(
    run_id: int,
    drawing_filepath: str,
    wis_filepath: str,
    vehicle_model: str,
    plant: str,
    component: str,
    db_url: str,
    llm_provider: str = "openai",
):
    """Background task: extract (with LLM vision if image), compare, score, persist."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    local_engine = create_engine(db_url, connect_args={"check_same_thread": False})
    LocalSession = sessionmaker(autocommit=False, autoflush=False, bind=local_engine)
    db = LocalSession()

    try:
        run = db.query(ValidationRun).filter(ValidationRun.id == run_id).first()
        if not run:
            return

        # Step 1: Extract fields
        # Drawing may be an image → LLM vision agent will be invoked automatically
        drawing_fields = extract_fields(
            drawing_filepath,
            vehicle_model,
            component,
            doc_type="drawing",
            llm_provider=llm_provider,
            plant=plant,
        )
        # WIS is always a PDF/DOCX → regex extraction
        wis_fields = extract_fields(
            wis_filepath,
            vehicle_model,
            component,
            doc_type="wis",
            llm_provider=llm_provider,
            plant=plant,
        )

        # Step 2: Compare fields to find deviations
        deviations = compare_fields(drawing_fields, wis_fields, vehicle_model, component)

        # Step 3: Score and persist deviations
        critical_count = high_count = medium_count = low_count = 0

        for dev in deviations:
            cost = get_cost_impact(dev.severity)
            deviation_record = Deviation(
                run_id=run_id,
                component=dev.component,
                field_name=dev.field_name,
                drawing_value=str(dev.drawing_value),
                wis_value=str(dev.wis_value),
                deviation_magnitude=dev.deviation_magnitude,
                severity=dev.severity,
                cost_impact_inr=cost,
                recommendation=dev.recommendation,
                is_acknowledged=False,
            )
            db.add(deviation_record)

            if dev.severity == "Critical":
                critical_count += 1
            elif dev.severity == "High":
                high_count += 1
            elif dev.severity == "Medium":
                medium_count += 1
            elif dev.severity == "Low":
                low_count += 1

        # Step 4: Count fields and matches
        from engine.comparator import NUMERIC_FIELDS, STRING_FIELDS, BOOL_FIELDS
        all_fields = NUMERIC_FIELDS + STRING_FIELDS + BOOL_FIELDS
        total_params = sum(
            1 for f in all_fields
            if drawing_fields.get(f) is not None and wis_fields.get(f) is not None
        )
        matched = max(0, total_params - len(deviations))

        # Step 5: Update run record
        run.status = "complete"
        run.total_params = total_params
        run.matched = matched
        run.critical_count = critical_count
        run.high_count = high_count
        run.medium_count = medium_count
        run.low_count = low_count

        db.add(AuditLog(
            run_id=run_id,
            event_type="validation_complete",
            event_detail=(
                f"Validation completed via {llm_provider.upper()} LLM: "
                f"{critical_count} critical, {high_count} high, "
                f"{medium_count} medium, {low_count} low deviations"
            ),
            user="system",
        ))

        db.commit()

    except Exception as e:
        db.rollback()
        try:
            run = db.query(ValidationRun).filter(ValidationRun.id == run_id).first()
            if run:
                run.status = "error"
                db.add(AuditLog(
                    run_id=run_id,
                    event_type="validation_error",
                    event_detail=str(e),
                    user="system",
                ))
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/")
def start_validation(
    payload: ValidationRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Kick off a validation run for the given drawing and WIS file IDs."""
    try:
        drawing_file = _find_uploaded_file(payload.drawing_id, DRAWINGS_UPLOAD_DIR)
        wis_file = _find_uploaded_file(payload.wis_id, WIS_UPLOAD_DIR)

        drawing_filename = drawing_file.name if drawing_file else f"{payload.drawing_id}"
        wis_filename = wis_file.name if wis_file else f"{payload.wis_id}"

        drawing_filepath = str(drawing_file) if drawing_file else str(
            DRAWINGS_UPLOAD_DIR / f"{payload.drawing_id}.pdf"
        )
        wis_filepath = str(wis_file) if wis_file else str(
            WIS_UPLOAD_DIR / f"{payload.wis_id}.pdf"
        )

        run = ValidationRun(
            vehicle_model=payload.vehicle_model,
            plant=payload.plant,
            component=payload.component,
            run_timestamp=datetime.utcnow(),
            drawing_filename=drawing_filename,
            wis_filename=wis_filename,
            status="processing",
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        db.add(AuditLog(
            run_id=run.id,
            event_type="validation_started",
            event_detail=(
                f"Validation started for {payload.vehicle_model} / {payload.component} "
                f"using {payload.llm_provider.upper()} LLM"
            ),
            user="system",
        ))
        db.commit()

        from database import SQLALCHEMY_DATABASE_URL
        background_tasks.add_task(
            _run_validation_task,
            run_id=run.id,
            drawing_filepath=drawing_filepath,
            wis_filepath=wis_filepath,
            vehicle_model=payload.vehicle_model,
            plant=payload.plant,
            component=payload.component,
            db_url=SQLALCHEMY_DATABASE_URL,
            llm_provider=payload.llm_provider,
        )

        return {"run_id": run.id, "status": run.status}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start validation: {str(e)}")


@router.get("/{run_id}", response_model=ValidationRunResponse)
def get_validation_run(run_id: int, db: Session = Depends(get_db)):
    """Retrieve a validation run with all its deviations."""
    try:
        run = db.query(ValidationRun).filter(ValidationRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail=f"Validation run {run_id} not found.")
        return run
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve run: {str(e)}")


@router.patch("/deviations/{deviation_id}/acknowledge", response_model=DeviationResponse)
def acknowledge_deviation(deviation_id: int, db: Session = Depends(get_db)):
    """Mark a deviation as acknowledged by a QA Engineer."""
    try:
        deviation = db.query(Deviation).filter(Deviation.id == deviation_id).first()
        if not deviation:
            raise HTTPException(status_code=404, detail=f"Deviation {deviation_id} not found.")

        deviation.is_acknowledged = True
        deviation.acknowledged_by = "QA Engineer"
        deviation.acknowledged_at = datetime.utcnow()
        db.commit()
        db.refresh(deviation)

        db.add(AuditLog(
            run_id=deviation.run_id,
            event_type="deviation_acknowledged",
            event_detail=(
                f"Deviation {deviation_id} ({deviation.field_name}) acknowledged by QA Engineer"
            ),
            user="QA Engineer",
        ))
        db.commit()

        return deviation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge deviation: {str(e)}")
