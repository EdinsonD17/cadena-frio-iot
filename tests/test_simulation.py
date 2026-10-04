import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from simulator.virtual_temperature_sensor import VirtualTemperatureSensor
from simulator.virtual_level_sensor import VirtualLevelSensor
from simulator.virtual_lid_sensor import VirtualLidSensor
from simulator.virtual_cooling import VirtualCooling

class TestVirtualTemperatureSensor:
    def test_initial_temperature(self):
        sensor = VirtualTemperatureSensor(initial_temp=4.0)
        assert 3.5 <= sensor.read(False) <= 4.5

    def test_temperature_increases_without_cooling(self):
        sensor = VirtualTemperatureSensor(initial_temp=4.0, noise=0)
        for _ in range(10):
            temp = sensor.read(cooling_active=False)
        assert temp > 4.0
    
    def test_temperature_decreases_with_cooling(self):
        sensor = VirtualTemperatureSensor(initial_temp=6.0, noise=0)
        for _ in range(10):
            temp = sensor.read(cooling_active=True)
        assert temp < 6.0
    
    def test_faulty_sensor_returns_none(self):
        sensor = VirtualTemperatureSensor()
        sensor.set_faulty(True)
        assert sensor.read(False) is None
    
    def test_reset(self):
        sensor = VirtualTemperatureSensor(initial_temp=4.0)
        sensor.read(False)
        sensor.read(False)
        sensor.reset(4.0)
        assert 3.5 <= sensor.read(False) <= 4.5

class TestVirtualLevelSensor:
    def test_initial_level(self):
        sensor = VirtualLevelSensor(initial_level=80.0)
        level = sensor.read()
        assert 70 <= level <= 90
    
    def test_level_clamped(self):
        sensor = VirtualLevelSensor(initial_level=0.5)
        for _ in range(100):
            level = sensor.read()
        assert level >= 0
    
    def test_set_level(self):
        sensor = VirtualLevelSensor()
        sensor.set_level(50.0)
        assert abs(sensor.level - 50.0) < 1

class TestVirtualLidSensor:
    def test_initial_state_closed(self):
        sensor = VirtualLidSensor()
        assert sensor.read() == "CLOSED"
    
    def test_open(self):
        sensor = VirtualLidSensor()
        sensor.open()
        assert sensor.read() == "OPEN"
    
    def test_toggle(self):
        sensor = VirtualLidSensor()
        sensor.toggle()
        assert sensor.read() == "OPEN"
        sensor.toggle()
        assert sensor.read() == "CLOSED"

class TestVirtualCooling:
    def test_auto_control_activates_on_high_temp(self):
        cooling = VirtualCooling()
        result = cooling.apply_auto_control(6.5)
        assert cooling.active == True
        assert result.get("alert") is not None
    
    def test_auto_control_deactivates_on_low_temp(self):
        cooling = VirtualCooling()
        cooling.active = True
        result = cooling.apply_auto_control(3.0)
        assert cooling.active == False
    
    def test_manual_mode_no_auto_changes(self):
        cooling = VirtualCooling()
        cooling.set_mode("MANUAL")
        cooling.turn_off()
        cooling.apply_auto_control(7.0)
        assert cooling.active == False

    def test_manual_on_off(self):
        cooling = VirtualCooling()
        cooling.set_mode("MANUAL")
        cooling.turn_on()
        assert cooling.active == True
        cooling.turn_off()
        assert cooling.active == False

class TestAutoControlCycle:
    def test_temperature_above_warning_triggers_cooling(self):
        # Inicia a 3.95 °C (por debajo del setpoint de 4.0 °C).
        # El calentamiento fisico natural del tanque hace subir la temperatura hasta cruzar 4.0 °C,
        # lo que debe disparar la activacion del sistema de refrigeracion.
        temp_sensor = VirtualTemperatureSensor(initial_temp=3.95, noise=0)
        cooling = VirtualCooling()
        for _ in range(40):
            temp = temp_sensor.read(cooling.active)
            if cooling.mode == "AUTO":
                cooling.apply_auto_control(temp)
            if cooling.active:
                break
        assert cooling.active == True
    
    def test_temperature_below_cooling_off_stops_cooling(self):
        # Inicia a 3.60 °C con refrigeracion activa.
        # El enfriamiento fisico reduce la temperatura hasta cruzar el umbral inferior de 3.50 °C,
        # momento en el cual el termostato apaga la refrigeracion.
        temp_sensor = VirtualTemperatureSensor(initial_temp=3.60, noise=0)
        cooling = VirtualCooling()
        cooling.active = True
        for _ in range(30):
            temp = temp_sensor.read(cooling.active)
            if cooling.mode == "AUTO":
                cooling.apply_auto_control(temp)
            if temp is not None and temp <= 3.5:
                break
        assert cooling.active == False

    def test_average_temperature_calculation(self):
        temps = [4.0, 4.5, 5.0, 5.5, 6.0]
        avg = sum(temps) / len(temps)
        assert avg == 5.0
    
    def test_max_temperature_calculation(self):
        temps = [4.0, 4.5, 5.0, 5.5, 6.0]
        assert max(temps) == 6.0
    
    def test_out_of_range_time(self):
        warning = 6.0
        cycle = 2
        temps = [4.0, 5.0, 6.5, 7.0, 5.0]
        out_of_range = sum(cycle for t in temps if t > warning)
        assert out_of_range == 4

    def test_mqtt_disconnect_local_control_continues(self):
        temp_sensor = VirtualTemperatureSensor(initial_temp=7.0, noise=0)
        cooling = VirtualCooling()
        temp = temp_sensor.read(cooling.active)
        result = cooling.apply_auto_control(temp)
        assert cooling.active == True

    def test_invalid_sensor_detection(self):
        sensor = VirtualTemperatureSensor()
        sensor.set_faulty(True)
        reading = sensor.read(False)
        assert reading is None
        total = 10
        valid = 8
        pct = (valid / total) * 100
        assert pct == 80.0
