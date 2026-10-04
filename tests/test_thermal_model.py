"""
Pruebas unitarias para el modelo termico fisico y control del tanque de leche.
Valida conservacion de entalpia, inercia termica, conduccion/conveccion,
y el ciclo de termostato sin oscilaciones no fisicas.
"""
import pytest
from simulator.thermal_model import MilkTankThermalModel, ThermalConfig
from simulator.virtual_cooling import VirtualCooling


class TestMilkTankThermalModel:
    def test_thermal_inertia_proportional_to_mass(self):
        """Un tanque lleno (1000 L) debe calentarse mucho mas lento que uno casi vacio (150 L)."""
        cfg = ThermalConfig(ambient_temp=25.0, tank_capacity_liters=1000.0)
        # Tanque lleno (100%)
        model_full = MilkTankThermalModel(initial_temp=4.0, initial_level=100.0, config=cfg)
        # Tanque con poco volumen (15%)
        model_low = MilkTankThermalModel(initial_temp=4.0, initial_level=15.0, config=cfg)

        # Simular 300 segundos (150 pasos de dt=2s) sin refrigeracion y tapa cerrada
        for _ in range(150):
            model_full.step(dt_seconds=2.0)
            model_low.step(dt_seconds=2.0)

        delta_full = model_full.temperature - 4.0
        delta_low = model_low.temperature - 4.0

        # El incremento en tanque con menor masa debe ser significativamente mayor
        assert delta_low > delta_full * 3.0
        assert delta_full < 0.3  # Muy estable para 1000 L en 5 min

    def test_lid_opening_increases_heat_gain(self):
        """Abrir la tapa incrementa la tasa de calentamiento convectivo (factor 3.8x)."""
        cfg = ThermalConfig(ambient_temp=25.0)
        model_closed = MilkTankThermalModel(initial_temp=4.0, initial_level=50.0, config=cfg)
        model_open = MilkTankThermalModel(initial_temp=4.0, initial_level=50.0, config=cfg)
        model_open.set_lid("OPEN")

        for _ in range(100):
            model_closed.step(dt_seconds=2.0)
            model_open.step(dt_seconds=2.0)

        delta_closed = model_closed.temperature - 4.0
        delta_open = model_open.temperature - 4.0

        assert delta_open > delta_closed * 2.5

    def test_enthalpy_mixing_on_milk_addition(self):
        """Agregar leche a mayor temperatura realiza balance entalpico exacto."""
        cfg = ThermalConfig(ambient_temp=25.0, milk_entry_temp=20.0, tank_capacity_liters=1000.0)
        # 500 L (50%) a 4.0 °C
        model = MilkTankThermalModel(initial_temp=4.0, initial_level=50.0, config=cfg)
        
        # Subir nivel a 60% (agrega 10% = 100 L a 20.0 °C)
        # m_old = 500 * 1.03 = 515 kg, m_added = 100 * 1.03 = 103 kg
        # T_mix = (515 * 4 + 103 * 20) / 618 = (2060 + 2060) / 618 = 4120 / 618 = 6.666 °C
        model.set_level(60.0)

        assert abs(model.temperature - 6.67) < 0.1
        assert model.level == 60.0

    def test_cooling_power_overcomes_ambient_warming(self):
        """El sistema Peltier activado es capaz de enfriar el liquido desde 6.0 °C."""
        cfg = ThermalConfig(ambient_temp=25.0)
        model = MilkTankThermalModel(initial_temp=6.0, initial_level=80.0, config=cfg)
        model.cooling_active = True

        for _ in range(200):  # 400 segundos
            model.step(dt_seconds=2.0)

        assert model.temperature < 6.0

    def test_stable_thermostat_band_without_oscillation(self):
        """
        En operacion automatica normal durante 10 minutos (300 pasos de 2s),
        la temperatura debe oscilar suavemente entre cooling_off (3.5 °C) y target (4.0 °C)
        sin superar el limite de advertencia (6.0 °C).
        """
        cfg = ThermalConfig(ambient_temp=25.0, target_temp=4.0, cooling_off_temp=3.5, warning_temp=6.0)
        model = MilkTankThermalModel(initial_temp=3.8, initial_level=80.0, config=cfg)

        temps = []
        for _ in range(300):
            model.apply_auto_thermostat()
            model.step(dt_seconds=2.0)
            temps.append(model.temperature)

        # Maxima temperatura no debe superar target + margen leve de inercia
        assert max(temps) < 4.2
        # Minima temperatura no debe caer por debajo de cooling_off - margen leve
        assert min(temps) >= 3.4
        # La media debe permanecer en el rango seguro [3.5, 4.0]
        avg_temp = sum(temps) / len(temps)
        assert 3.5 <= avg_temp <= 4.0

    def test_model_scales_invariantly_with_dt(self):
        """
        La dinamica fisica debe ser invariante respecto al paso de tiempo dt_seconds.
        Simular 100 segundos con dt=2.0s (50 pasos) frente a dt=1.0s (100 pasos)
        debe arrojar temperaturas equivalentes (diferencia < 0.01 °C).
        """
        cfg = ThermalConfig(sensor_noise=0.0)
        model_a = MilkTankThermalModel(initial_temp=4.0, initial_level=80.0, config=cfg)
        for _ in range(50):
            model_a.step(dt_seconds=2.0)

        model_b = MilkTankThermalModel(initial_temp=4.0, initial_level=80.0, config=cfg)
        for _ in range(100):
            model_b.step(dt_seconds=1.0)

        assert abs(model_a.temperature - model_b.temperature) < 0.01


class TestAutoThermostatHysteresis:
    def test_cooling_activates_at_target_and_stops_at_cooling_off(self):
        cooling = VirtualCooling()
        cooling.mode = "AUTO"

        # A 3.8 °C en reposo, no enciende
        cooling.apply_auto_control(3.8)
        assert cooling.active == False

        # Al alcanzar 4.0 °C enciende
        cooling.apply_auto_control(4.0)
        assert cooling.active == True

        # Al enfriar a 3.7 °C, la histeresis lo mantiene encendido
        cooling.apply_auto_control(3.7)
        assert cooling.active == True

        # Al alcanzar 3.5 °C se apaga
        cooling.apply_auto_control(3.5)
        assert cooling.active == False
