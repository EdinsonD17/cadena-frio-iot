"""
Main Virtual ESP32 Simulator process.
"""
import time
import threading
import json
import signal
import sys
import os
from datetime import datetime

from simulator.virtual_temperature_sensor import VirtualTemperatureSensor
from simulator.virtual_level_sensor import VirtualLevelSensor
from simulator.virtual_lid_sensor import VirtualLidSensor
from simulator.virtual_cooling import VirtualCooling
from simulator.thermal_model import MilkTankThermalModel
from simulator.mqtt_client import SimulatorMQTTClient

MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))

class VirtualESP32:
    def __init__(self):
        self.model = MilkTankThermalModel(initial_temp=3.8, initial_level=80.0)
        self.temp_sensor = VirtualTemperatureSensor(initial_temp=3.8, model=self.model)
        self.level_sensor = VirtualLevelSensor(initial_level=80.0)
        self.lid_sensor = VirtualLidSensor()
        self.cooling = VirtualCooling()
        self.mqtt = SimulatorMQTTClient(broker=MQTT_BROKER, port=MQTT_PORT)
        self.running = False
        self.paused = False
        self.cycle_interval = 2  # seconds
        self.readings_count = 0
        self.valid_readings = 0
        self.temp_history = []
        self.out_of_range_time = 0
        self.cooling_time = 0
        self.alerts_count = 0
        self._high_temp_alert_active = False
        self._thread = None
    
    def start(self):
        self.running = True
        self._thread = threading.Thread(target=self._main_loop)
        self._thread.daemon = True
        self._thread.start()
        
    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=5.0)
            
    def pause(self):
        self.paused = True
        
    def resume(self):
        self.paused = False
        
    def reset(self):
        self.model.reset(temp=3.8, level=80.0)
        self.temp_sensor.reset(temp=3.8)
        self.level_sensor.reset(level=80.0)
        self.lid_sensor.reset()
        self.cooling.reset()
        self.readings_count = 0
        self.valid_readings = 0
        self.temp_history = []
        self.out_of_range_time = 0
        self.cooling_time = 0
        self.alerts_count = 0
        self._high_temp_alert_active = False
    
    def _main_loop(self):
        while self.running:
            if self.paused:
                time.sleep(0.5)
                continue
            self._cycle()
            time.sleep(self.cycle_interval)
            
    def step(self, dt_seconds=None):
        self._cycle(dt_seconds=dt_seconds)

    def _cycle(self, dt_seconds=None):
        dt = dt_seconds if dt_seconds is not None else self.cycle_interval
        lid = self.lid_sensor.read()
        self.model.set_lid(lid)
        self.model.mode = self.cooling.mode
        if self.cooling.mode == "MANUAL":
            self.model.cooling_active = self.cooling.active

        # Advance physical thermal model with PI Peltier modulation
        self.model.step(dt_seconds=dt)

        if self.cooling.mode == "AUTO":
            self.cooling.active = self.model.cooling_active

        # Level reading from sensor
        level = self.level_sensor.read()
        self.model.level = level

        # Temperature sensor measurement with noise (no artificial periodic waves)
        if self.temp_sensor.faulty or self.model.sensor_faulty:
            temp = None
        else:
            temp = self.model.read_sensor_temp()
            self.temp_sensor.temperature = self.model.temperature
        
        valid = temp is not None and not (temp < -40 or temp > 80)
        self.readings_count += 1
        if valid:
            self.valid_readings += 1
            self.temp_history.append(temp)
            
        if self.cooling.mode == "AUTO" and valid:
            result = self.cooling.apply_auto_control(temp, cooling_active=self.model.cooling_active)
            if result.get("alert"):
                if not self._high_temp_alert_active:
                    self._high_temp_alert_active = True
                    self.alerts_count += 1
                    if self.mqtt.is_available():
                        self.mqtt.publish("alerts", json.dumps({"message": result.get("alert"), "timestamp": datetime.now().isoformat()}))
            elif temp < (self.cooling.warning_temp - 0.2):
                self._high_temp_alert_active = False
                    
        if valid and temp > self.cooling.warning_temp:
            self.out_of_range_time += self.cycle_interval
        if self.cooling.active:
            self.cooling_time += self.cycle_interval
            
        avg_temp = sum(self.temp_history[-100:]) / len(self.temp_history[-100:]) if self.temp_history else 0
        max_temp = max(self.temp_history[-100:]) if self.temp_history else 0
        min_temp = min(self.temp_history[-100:]) if self.temp_history else 0
        
        if self.mqtt.is_available():
            data = {
                "temperature": temp if valid else None,
                "level": level,
                "lid": lid,
                "cooling": self.cooling.active,
                "mode": self.cooling.mode,
                "valid": valid,
                "mqtt_status": "connected",
                "timestamp": datetime.now().isoformat(),
                "kpis": {
                    "avg_temp": round(avg_temp, 1),
                    "max_temp": round(max_temp, 1),
                    "min_temp": round(min_temp, 1),
                    "out_of_range_seconds": self.out_of_range_time,
                    "valid_readings_pct": round(self.valid_readings/self.readings_count*100, 1) if self.readings_count else 100,
                    "cooling_time": self.cooling_time,
                    "alerts_count": self.alerts_count,
                    "readings_count": self.readings_count,
                }
            }
            self.mqtt.publish("temperature", json.dumps(data))
            
        if self.running:
            status = "MQTT CONNECTED" if self.mqtt.is_available() else "LOCAL CONTROL ACTIVE — MQTT NOT AVAILABLE"
            print(f"[ESP32 VIRTUAL] T={temp}°C | Level={level}% | Lid={lid} | Cooling={'ON' if self.cooling.active else 'OFF'} | {status}")
        
    def handle_command(self, topic, payload):
        # Try to parse JSON payload
        try:
            data = json.loads(payload)
        except (json.JSONDecodeError, TypeError):
            data = {"value": payload}

        value = data.get("value", payload) if isinstance(data, dict) else payload

        if "simulation/command" in topic:
            command = data.get("command", "") if isinstance(data, dict) else payload
            if command == "start":
                self.running = True
                self.paused = False
                if not self._thread or not self._thread.is_alive():
                    self.start()
            elif command == "pause":
                self.paused = not self.paused
            elif command == "reset":
                self.reset()
            elif command == "high-temperature":
                self.scenario_high_temp()
            elif command == "set-temp":
                try:
                    val = float(value)
                    self.model.temperature = val
                    self.temp_sensor.set_temperature(val)
                except (ValueError, TypeError):
                    pass
            elif command == "set-level":
                try:
                    val = float(value)
                    self.model.set_level(val)
                    self.level_sensor.set_level(val)
                except (ValueError, TypeError):
                    pass
            elif command == "open-lid":
                self.scenario_open_lid()
            elif command == "close-lid":
                self.scenario_close_lid()
            elif command == "low-level":
                self.scenario_low_level()
            elif command == "invalid-sensor":
                self.scenario_faulty_sensor()
            elif command == "valid-sensor":
                self.temp_sensor.set_faulty(False)
                self.model.sensor_faulty = False
            elif command == "mqtt-disconnect":
                self.scenario_mqtt_disconnect()
            elif command == "mqtt-reconnect":
                self.scenario_mqtt_reconnect()
            print(f"[ESP32 VIRTUAL] Simulation command received: {command}")
        elif "modo" in topic:
            mode_str = str(value).upper()
            self.cooling.set_mode(mode_str)
            self.model.mode = mode_str
        elif "refrigeracion" in topic:
            if str(value).upper() == "ON":
                self.cooling.turn_on()
                self.model.cooling_active = True
            elif str(value).upper() == "OFF":
                self.cooling.turn_off()
                self.model.cooling_active = False
        elif "temperatura-objetivo" in topic:
            try:
                val = float(value)
                self.cooling.target_temp = val
                self.model.config.target_temp = val
                self.model.config.control_setpoint = max(3.0, val - 0.25)
            except (ValueError, TypeError):
                pass
        elif "limite-advertencia" in topic:
            try:
                val = float(value)
                self.cooling.warning_temp = val
                self.model.config.warning_temp = val
            except (ValueError, TypeError):
                pass

    def scenario_high_temp(self):
        self.model.temperature = 7.5
        self.temp_sensor.set_temperature(7.5)
        
    def scenario_open_lid(self):
        self.lid_sensor.open()
        self.model.set_lid("OPEN")
        
    def scenario_close_lid(self):
        self.lid_sensor.close()
        self.model.set_lid("CLOSED")
        
    def scenario_low_level(self):
        self.model.set_level(15.0)
        self.level_sensor.set_level(15.0)
        
    def scenario_faulty_sensor(self):
        self.temp_sensor.set_faulty(True)
        self.model.sensor_faulty = True
        
    def scenario_mqtt_disconnect(self):
        self.mqtt.simulate_disconnect()
        
    def scenario_mqtt_reconnect(self):
        self.mqtt.simulate_reconnect()


if __name__ == "__main__":
    esp32 = VirtualESP32()
    
    def signal_handler(sig, frame):
        print("\n[ESP32 VIRTUAL] Shutting down...")
        esp32.stop()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("[ESP32 VIRTUAL] Starting simulator...")
    esp32.mqtt.set_command_callback(esp32.handle_command)
    esp32.mqtt.connect()
    esp32.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        esp32.stop()
