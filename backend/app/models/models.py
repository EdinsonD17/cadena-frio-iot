from dataclasses import dataclass
from typing import Optional

@dataclass
class SensorReading:
    timestamp: str
    temperature: Optional[float] = None
    level: Optional[float] = None
    lid_state: Optional[str] = None
    cooling: Optional[bool] = None
    mode: Optional[str] = None
    mqtt_status: Optional[str] = None
    valid: bool = True
    id: Optional[int] = None
