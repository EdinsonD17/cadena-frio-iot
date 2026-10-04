"""
Thermal physical model for IoT Cold Chain Milk Storage Tank.
First-order lumped thermal capacitance model with:
- Heat transfer to ambient (Newton's law of cooling/warming).
- Enhanced convective heat transfer when tank lid is open (factor 3.5x).
- Proportional-Integral (PI) modulated Peltier cooling power with anti-windup.
- Thermal equilibrium at setpoint 3.75 °C (variation < 0.1 °C in steady state).
- Saturation to 100% cooling power during large disturbance events (warm milk, open lid).
- Mass-weighted enthalpy mixture upon milk addition.
- Non-periodic Gaussian sensor noise (± 0.04 °C).
"""
import random
from dataclasses import dataclass


@dataclass
class ThermalConfig:
    # --- Regulatory and Thermal Setpoints (Unidades: °C) ---
    ambient_temp: float = 25.0            # Temperatura ambiente de sala (°C)
    control_setpoint: float = 3.75        # Setpoint objetivo del lazo PI (°C)
    target_temp: float = 4.0              # Límite superior de rango óptimo (°C)
    cooling_off_temp: float = 3.5         # Límite inferior de rango óptimo (°C)
    warning_temp: float = 6.0             # Umbral regulatorio de alarma (°C)

    # --- Dimensiones del Tanque y Propiedades de la Leche ---
    tank_capacity_liters: float = 1000.0  # Capacidad volumétrica total (L)
    milk_density: float = 1.03            # Densidad de la leche entera (kg/L)
    milk_entry_temp: float = 22.0         # Temperatura de entrada de leche fresca (°C)

    # --- Coeficientes Físicos de Transferencia (por ciclo base dt = 2.0 s a nivel 80%) ---
    base_heat_gain_coeff: float = 0.00008 # Ganancia conductiva natural por ciclo base de 2.0 s (adimensional)
    lid_open_factor: float = 31.0         # Multiplicador convectivo con tapa abierta (adimensional; calibrado para +0.5 a +1.0 °C en 2 min y superar Peltier a 100% en apertura prolongada)
    cooling_power_coeff: float = 0.045    # Tasa de enfriamiento máxima de la Peltier a 100% de potencia (°C/ciclo base 2.0 s; acelerada 3.75x para demo ágil)
    sensor_noise: float = 0.02            # Desviación típica del ruido Gaussiano no periódico del sensor DS18B20 (± °C)

    # --- Parámetros del Controlador PI de la Peltier ---
    kp: float = 1.2                       # Ganancia proporcional (1/°C; amortiguada para evitar overshoot con mayor potencia frigorífica)
    ki: float = 0.0002                    # Ganancia integral (1/(°C*s))
    u_base: float = 0.0378                # Potencia de equilibrio precalculada a 3.75 °C (0.00170 °C/ciclo / 0.045 °C/ciclo = 0.03778)
    integral_min: float = -0.04           # Límite inferior anti-windup del acumulador integral
    integral_max: float = 0.15            # Límite superior anti-windup del acumulador integral


class MilkTankThermalModel:
    def __init__(self, initial_temp: float = 3.8, initial_level: float = 80.0, config: ThermalConfig = None):
        self.config = config or ThermalConfig()
        self.temperature = float(initial_temp)
        self.level = float(initial_level)
        self.lid_state = "CLOSED"
        self.cooling_active = False
        self.cooling_power = 0.0          # Fracción modulada de potencia Peltier [0.0 - 1.0]
        self.mode = "AUTO"
        self.sensor_faulty = False
        self.integral_error = 0.0         # Acumulador integral con anti-windup

    def get_mass(self) -> float:
        """Retorna la masa de leche almacenada en kg según el porcentaje de nivel."""
        liters = (max(2.0, min(100.0, self.level)) / 100.0) * self.config.tank_capacity_liters
        return liters * self.config.milk_density

    def set_level(self, new_level: float):
        """
        Actualiza el nivel de leche. Si new_level > nivel actual, ingresa leche fresca
        a temperatura de entrada (24 °C) y la temperatura resultante sigue la conservación exacta de entalpía.
        """
        clamped_new = max(0.0, min(100.0, float(new_level)))
        old_level = self.level

        if clamped_new > old_level:
            m_old = (max(1.0, old_level) / 100.0) * self.config.tank_capacity_liters * self.config.milk_density
            m_added = ((clamped_new - old_level) / 100.0) * self.config.tank_capacity_liters * self.config.milk_density
            
            # Balance entálpico: T_mezcla = (m1 * T1 + m2 * T2) / (m1 + m2)
            self.temperature = (m_old * self.temperature + m_added * self.config.milk_entry_temp) / (m_old + m_added)
        
        self.level = clamped_new

    def set_lid(self, state: str):
        self.lid_state = "OPEN" if str(state).upper() == "OPEN" else "CLOSED"

    def step(self, dt_seconds: float = 2.0) -> float:
        """
        Avanza la simulación física dt_seconds aplicando balance térmico y control PI.
        La dinámica física escala de forma invariante con el paso de tiempo dt_seconds.
        """
        # Factor de escala temporal relativo al ciclo base de 2.0 s
        dt_factor = dt_seconds / 2.0

        # 1. Inercia térmica escalada por masa de leche (normalizada a 80%)
        nominal_mass = 80.0 * (self.config.tank_capacity_liters / 100.0) * self.config.milk_density
        current_mass = max(30.0, self.get_mass())
        inertia_factor = nominal_mass / current_mass

        # 2. Control de la Peltier (AUTO: modulación PI; MANUAL: 0% o 100%)
        if self.mode == "AUTO":
            err = self.temperature - self.config.control_setpoint
            
            # Integrador con anti-windup (escalado por dt_seconds)
            self.integral_error += self.config.ki * err * dt_seconds
            self.integral_error = max(self.config.integral_min, min(self.config.integral_max, self.integral_error))

            # Potencia proporcional + integral + feedforward de equilibrio
            u = self.config.u_base + self.config.kp * err + self.integral_error
            
            # Saturación suave entre 0.0 (apagado) y 1.0 (máxima potencia frigorífica)
            self.cooling_power = max(0.0, min(1.0, u))
            self.cooling_active = self.cooling_power > 0.05
        else:
            # Modo manual: depende directamente del interruptor
            self.cooling_power = 1.0 if self.cooling_active else 0.0

        # 3. Ganancia de calor del ambiente (Ley de Newton) escalada por dt
        temp_diff = self.config.ambient_temp - self.temperature
        lid_multiplier = self.config.lid_open_factor if self.lid_state == "OPEN" else 1.0
        heat_gain = temp_diff * self.config.base_heat_gain_coeff * lid_multiplier * inertia_factor * dt_factor

        # 4. Potencia frigorífica aplicada escalada por dt
        cooling_effect = self.cooling_power * self.config.cooling_power_coeff * inertia_factor * dt_factor

        # 5. Delta de temperatura neto
        self.temperature += (heat_gain - cooling_effect)

        return self.temperature

    def read_sensor_temp(self) -> float | None:
        """Retorna la medición del sensor con ruido Gaussiano no periódico realista."""
        if self.sensor_faulty:
            return None
        noise = random.gauss(0, self.config.sensor_noise)
        return round(self.temperature + noise, 2)

    def apply_auto_thermostat(self) -> bool:
        """Compatibilidad de API para el ciclo automático."""
        old_state = self.cooling_active
        self.step(dt_seconds=2.0)
        return self.cooling_active != old_state

    def reset(self, temp: float = 3.8, level: float = 80.0):
        self.temperature = float(temp)
        self.level = float(level)
        self.lid_state = "CLOSED"
        self.cooling_active = False
        self.cooling_power = 0.0
        self.mode = "AUTO"
        self.sensor_faulty = False
        self.integral_error = 0.0
