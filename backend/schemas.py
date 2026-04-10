from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ValidationRunCreate(BaseModel):
    drawing_id: str
    wis_id: str
    vehicle_model: str
    plant: str
    component: str
    llm_provider: str = "openai"  # "openai" or "azure"


class DeviationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    component: str
    field_name: str
    drawing_value: Optional[str] = None
    wis_value: Optional[str] = None
    deviation_magnitude: Optional[float] = None
    severity: str
    cost_impact_inr: int
    recommendation: Optional[str] = None
    is_acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None


class ValidationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_model: str
    plant: str
    component: str
    run_timestamp: Optional[datetime] = None
    drawing_filename: Optional[str] = None
    wis_filename: Optional[str] = None
    status: str
    total_params: int
    matched: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    deviations: List[DeviationResponse] = []


class DashboardSummary(BaseModel):
    total_runs: int
    total_deviations: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    match_rate: float
    cost_impact_total: int


class HeatmapCell(BaseModel):
    plant: str
    component: str
    max_severity: str
    deviation_count: int


class TrendDataPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month_label: str
    month_index: int
    deviation_count: int
    rework_cost_inr: int
    detection_time_days: int
    without_ai_count: int


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
