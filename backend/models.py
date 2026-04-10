from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_model = Column(String, nullable=False)
    plant = Column(String, nullable=False)
    component = Column(String, nullable=False)
    run_timestamp = Column(DateTime, default=datetime.utcnow)
    drawing_filename = Column(String, nullable=True)
    wis_filename = Column(String, nullable=True)
    status = Column(String, default="processing")
    total_params = Column(Integer, default=0)
    matched = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)

    deviations = relationship("Deviation", back_populates="run", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="run", cascade="all, delete-orphan")


class Deviation(Base):
    __tablename__ = "deviations"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("validation_runs.id"), nullable=False)
    component = Column(String, nullable=False)
    field_name = Column(String, nullable=False)
    drawing_value = Column(String, nullable=True)
    wis_value = Column(String, nullable=True)
    deviation_magnitude = Column(Float, nullable=True)
    severity = Column(String, nullable=False)
    cost_impact_inr = Column(Integer, default=0)
    recommendation = Column(String, nullable=True)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    run = relationship("ValidationRun", back_populates="deviations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("validation_runs.id"), nullable=True)
    event_type = Column(String, nullable=False)
    event_detail = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = Column(String, default="system")

    run = relationship("ValidationRun", back_populates="audit_logs")


class MonthlyTrend(Base):
    __tablename__ = "monthly_trends"

    id = Column(Integer, primary_key=True, index=True)
    month_label = Column(String, nullable=False)
    month_index = Column(Integer, nullable=False)
    deviation_count = Column(Integer, nullable=False)
    rework_cost_inr = Column(Integer, nullable=False)
    detection_time_days = Column(Integer, nullable=False)
    without_ai_count = Column(Integer, default=45)
