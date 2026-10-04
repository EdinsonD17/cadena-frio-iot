"""
Ultrasonic virtual level sensor simulator.
Provides stable liquid level measurements without automatic drain drift.
Explicit level adjustments (+10%, -10%, Full, Low Level scenario) update the level directly.
"""
import random


class VirtualLevelSensor:
    def __init__(self, initial_level: float = 80.0):
        self.level = float(initial_level)
        self.drain_rate = 0.0  # Vaciado automático eliminado para mantener nivel estable sin drift artificial
        self.noise = 0.1       # Ruido mínimo realista de medición ultrasónica
    
    def read(self) -> float:
        noise_val = random.uniform(-self.noise, self.noise)
        reading = max(0.0, min(100.0, self.level + noise_val))
        return round(reading, 1)
        
    def set_level(self, level: float):
        self.level = max(0.0, min(100.0, float(level)))
        
    def reset(self, level: float = 80.0):
        self.level = float(level)
