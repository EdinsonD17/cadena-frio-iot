"""
DS18B20 virtual temperature sensor simulator.
Delegates to MilkTankThermalModel for physical realism while preserving public API.
"""
from typing import Optional
from simulator.thermal_model import MilkTankThermalModel, ThermalConfig


class VirtualTemperatureSensor:
    def __init__(
        self,
        initial_temp: float = 3.8,
        ambient_temp: float = 25.0,
        heating_rate: float = 0.15,   # Obsoleto: conservado por compatibilidad de interfaz
        cooling_rate: float = 0.20,   # Obsoleto: conservado por compatibilidad de interfaz
        noise: Optional[float] = None,
        model: Optional[MilkTankThermalModel] = None,
    ):
        self.heating_rate = heating_rate
        self.cooling_rate = cooling_rate
        self.ambient_temp = ambient_temp
        if model is not None:
            self.model = model
            self.noise = float(noise) if noise is not None else float(self.model.config.sensor_noise)
            if noise is not None:
                self.model.config.sensor_noise = self.noise
        else:
            self.noise = float(noise) if noise is not None else 0.02
            cfg = ThermalConfig(ambient_temp=ambient_temp, sensor_noise=self.noise)
            self.model = MilkTankThermalModel(initial_temp=initial_temp, config=cfg)
        self.temperature = float(initial_temp)
        self.faulty = False

    def read(self, cooling_active: bool = False) -> float | None:
        if self.faulty or self.model.sensor_faulty:
            return None
        self.model.mode = "MANUAL"
        self.model.cooling_active = bool(cooling_active)
        self.model.step(dt_seconds=2.0)
        reading = self.model.read_sensor_temp()
        self.temperature = self.model.temperature
        return reading

    def set_faulty(self, faulty: bool):
        self.faulty = bool(faulty)
        self.model.sensor_faulty = bool(faulty)

    def reset(self, temp: float = 3.8):
        self.temperature = float(temp)
        self.faulty = False
        self.model.reset(temp=temp)

    def set_temperature(self, temp: float):
        self.temperature = float(temp)
        self.model.temperature = float(temp)
