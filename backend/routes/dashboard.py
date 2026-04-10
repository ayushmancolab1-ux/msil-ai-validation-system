from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import ValidationRun, Deviation, MonthlyTrend
from schemas import DashboardSummary, HeatmapCell, TrendDataPoint
from engine.scorer import get_severity_order

router = APIRouter()

SEVERITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    """Aggregate dashboard summary across all validation runs."""
    try:
        total_runs = db.query(func.count(ValidationRun.id)).scalar() or 0

        agg = db.query(
            func.count(Deviation.id).label("total_deviations"),
            func.sum(
                func.cast(Deviation.severity == "Critical", int)
            ).label("critical_count"),
            func.sum(
                func.cast(Deviation.severity == "High", int)
            ).label("high_count"),
            func.sum(
                func.cast(Deviation.severity == "Medium", int)
            ).label("medium_count"),
            func.sum(
                func.cast(Deviation.severity == "Low", int)
            ).label("low_count"),
            func.sum(Deviation.cost_impact_inr).label("cost_total"),
        ).first()

        total_deviations = agg.total_deviations or 0
        critical_count = int(agg.critical_count or 0)
        high_count = int(agg.high_count or 0)
        medium_count = int(agg.medium_count or 0)
        low_count = int(agg.low_count or 0)
        cost_total = int(agg.cost_total or 0)

        run_totals = db.query(
            func.sum(ValidationRun.total_params).label("total_params"),
            func.sum(ValidationRun.matched).label("total_matched"),
        ).first()

        total_params = run_totals.total_params or 0
        total_matched = run_totals.total_matched or 0

        match_rate = round((total_matched / total_params * 100), 2) if total_params > 0 else 0.0

        return DashboardSummary(
            total_runs=total_runs,
            total_deviations=total_deviations,
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            low_count=low_count,
            match_rate=match_rate,
            cost_impact_total=cost_total,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute summary: {str(e)}")


@router.get("/heatmap", response_model=List[HeatmapCell])
def get_heatmap(db: Session = Depends(get_db)):
    """Return heatmap data grouped by plant and component."""
    try:
        rows = (
            db.query(
                ValidationRun.plant,
                Deviation.component,
                Deviation.severity,
                func.count(Deviation.id).label("deviation_count"),
            )
            .join(Deviation, Deviation.run_id == ValidationRun.id)
            .group_by(ValidationRun.plant, Deviation.component, Deviation.severity)
            .all()
        )

        # Group by (plant, component) and aggregate
        cell_map = {}
        for row in rows:
            key = (row.plant, row.component)
            if key not in cell_map:
                cell_map[key] = {"max_severity": row.severity, "deviation_count": 0}

            cell_map[key]["deviation_count"] += row.deviation_count

            # Update max severity (lower rank = more severe)
            current_rank = SEVERITY_RANK.get(cell_map[key]["max_severity"], 3)
            new_rank = SEVERITY_RANK.get(row.severity, 3)
            if new_rank < current_rank:
                cell_map[key]["max_severity"] = row.severity

        result = [
            HeatmapCell(
                plant=plant,
                component=component,
                max_severity=data["max_severity"],
                deviation_count=data["deviation_count"],
            )
            for (plant, component), data in sorted(cell_map.items())
        ]

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute heatmap: {str(e)}")


@router.get("/trend", response_model=List[TrendDataPoint])
def get_trend(db: Session = Depends(get_db)):
    """Return monthly trend data, ordered by month index."""
    try:
        trends = (
            db.query(MonthlyTrend)
            .order_by(MonthlyTrend.month_index.asc())
            .all()
        )

        if not trends:
            # Return empty list gracefully if table has no data
            return []

        return trends

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve trend data: {str(e)}")
