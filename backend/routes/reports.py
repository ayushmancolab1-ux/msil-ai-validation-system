import io
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import ValidationRun, Deviation
from schemas import ValidationRunResponse

router = APIRouter()


@router.get("/", response_model=List[ValidationRunResponse])
def list_reports(db: Session = Depends(get_db)):
    """Return all validation runs ordered by most recent first."""
    try:
        runs = (
            db.query(ValidationRun)
            .order_by(ValidationRun.run_timestamp.desc())
            .all()
        )
        return runs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve reports: {str(e)}")


@router.get("/{run_id}/export")
def export_run_csv(run_id: int, db: Session = Depends(get_db)):
    """Export all deviations for a given run as a CSV file."""
    try:
        run = db.query(ValidationRun).filter(ValidationRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail=f"Validation run {run_id} not found.")

        deviations = (
            db.query(Deviation)
            .filter(Deviation.run_id == run_id)
            .all()
        )

        rows = []
        for dev in deviations:
            rows.append({
                "Deviation ID": dev.id,
                "Run ID": dev.run_id,
                "Vehicle Model": run.vehicle_model,
                "Plant": run.plant,
                "Component": dev.component,
                "Field Name": dev.field_name,
                "Drawing Value": dev.drawing_value,
                "WIS Value": dev.wis_value,
                "Deviation Magnitude": dev.deviation_magnitude,
                "Severity": dev.severity,
                "Cost Impact (INR)": dev.cost_impact_inr,
                "Recommendation": dev.recommendation,
                "Acknowledged": dev.is_acknowledged,
                "Acknowledged By": dev.acknowledged_by,
                "Acknowledged At": dev.acknowledged_at,
            })

        if not rows:
            rows = [{"message": "No deviations found for this run."}]

        df = pd.DataFrame(rows)
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)

        filename = f"validation_run_{run_id}_{run.vehicle_model.replace(' ', '_')}_{run.plant}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")
