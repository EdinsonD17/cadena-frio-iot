from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SensorReading(BaseModel):
    temperature: Optional[float] = None
    level: Optional[float] = None
    lid_state: Optional[str] = None
    cooling: Optional[bool] = None
    mode: Optional[str] = None
    mqtt_status: Optional[str] = None
    valid: Optional[bool] = True
    timestamp: Optional[str] = None

class ControlCommand(BaseModel):
    value: str  # "ON", "OFF", "AUTO", "MANUAL"

class SimulationConfig(BaseModel):
    initial_temp: Optional[float] = 4.0
    ambient_temp: Optional[float] = 25.0
    # Obsoleto: Reemplazado por MilkTankThermalModel; conservado por compatibilidad de esquemas
    heating_rate: Optional[float] = 0.15
    cooling_rate: Optional[float] = 0.20
    noise: Optional[float] = 0.1
    level: Optional[float] = 80.0

class KPIs(BaseModel):
    avg_temp: float
    max_temp: float
    min_temp: float
    out_of_range_seconds: int
    valid_readings_pct: float
    mqtt_availability_pct: float
    alerts_count: int
    events_count: int
    cooling_time: int
    readings_count: int

class AlertSchema(BaseModel):
    id: Optional[int] = None
    timestamp: str
    type: str
    message: str
    severity: str = "warning"
    status: str = "active"

class EventSchema(BaseModel):
    id: Optional[int] = None
    timestamp: str
    event_type: str
    description: str
    value: Optional[str] = None

class ConfigSchema(BaseModel):
    temperature_target: float = 4.0
    temperature_warning: float = 6.0
    temperature_cooling_off: float = 3.5

class SystemStatus(BaseModel):
    esp32_status: str = "ACTIVE"
    mqtt_status: str = "CONNECTED"
    db_status: str = "CONNECTED"
    mode: str = "AUTO"
    cooling: bool = False
    simulation_running: bool = False
    simulation_paused: bool = False
    system_state: str = "NORMAL"  # NORMAL, WARNING, CRITICAL
