import paho.mqtt.client as mqtt
import json, os, asyncio
from datetime import datetime

TOPICS = {
    "temperature": "cadena-frio/monitoreo/temperatura",
    "level": "cadena-frio/monitoreo/nivel",
    "lid": "cadena-frio/monitoreo/tapa",
    "cooling_control": "cadena-frio/control/refrigeracion",
    "mode_control": "cadena-frio/control/modo",
    "target_temp": "cadena-frio/configuracion/temperatura-objetivo",
    "warning_temp": "cadena-frio/configuracion/limite-advertencia",
    "avg_temp": "cadena-frio/indicadores/temperatura-promedio",
    "max_temp": "cadena-frio/indicadores/temperatura-maxima",
    "out_of_range": "cadena-frio/indicadores/tiempo-fuera-rango",
    "alerts": "cadena-frio/alertas",
}


class MQTTHandler:
    def __init__(self, data_service, adafruit_sim, ws_manager):
        self.broker = os.environ.get("MQTT_BROKER", "localhost")
        self.port = int(os.environ.get("MQTT_PORT", "1883"))
        self.client = mqtt.Client(
            client_id="backend-server",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        self.data_service = data_service
        self.adafruit_sim = adafruit_sim
        self.ws_manager = ws_manager
        self.connected = False
        self.message_log = []
        self._last_status = {}
        self._previous_lid = "CLOSED"
        self._temp_alert_active = False
        self._level_alert_active = False
        self._sensor_invalid_alert_active = False

    # ------------------------------------------------------------------
    # Connection helpers
    # ------------------------------------------------------------------
    def connect(self):
        try:
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            print(f"[BACKEND] MQTT connection failed: {e}. Will retry...")

    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()

    # ------------------------------------------------------------------
    # Callbacks
    # ------------------------------------------------------------------
    def _on_connect(self, client, userdata, flags, rc, properties):
        print(f"[BACKEND] MQTT Connected (rc={rc})")
        self.client.subscribe("cadena-frio/#")
        self.connected = True

    def _on_disconnect(self, client, userdata, disconnect_flags, rc, properties):
        print("[BACKEND] MQTT Disconnected")
        self.connected = False

    def _on_message(self, client, userdata, msg):
        payload_str = msg.payload.decode("utf-8", errors="ignore")
        topic = msg.topic
        timestamp = datetime.now().isoformat()

        # ---------- message log for MQTT console ----------
        self.message_log.append(
            {"timestamp": timestamp, "topic": topic, "message": payload_str}
        )
        if len(self.message_log) > 1000:
            self.message_log = self.message_log[-500:]

        try:
            data = json.loads(payload_str)
        except json.JSONDecodeError:
            data = {"value": payload_str}

        # ---------- main telemetry from ESP32 virtual ----------
        if topic == TOPICS["temperature"]:
            self._handle_telemetry(data, timestamp)

        elif topic == TOPICS["alerts"]:
            alert_msg = data.get("message", str(data))
            # Broadcast to WebSocket clients for real-time notification
            self._broadcast({"type": "alert", "data": data, "timestamp": timestamp})
            # Evitar duplicar en SQLite alertas de temperatura alta (registradas como TEMPERATURA_ALTA por el episodio de telemetria)
            is_temp_high = "temperature high" in str(alert_msg).lower() or "temperatura alta" in str(alert_msg).lower()
            if not is_temp_high:
                self.data_service.save_alert("SISTEMA", alert_msg, "warning")

        else:
            # generic pass-through
            self._broadcast(
                {
                    "type": "mqtt_message",
                    "topic": topic,
                    "payload": data,
                    "timestamp": timestamp,
                }
            )

    # ------------------------------------------------------------------
    # Telemetry processing
    # ------------------------------------------------------------------
    def _handle_telemetry(self, data: dict, timestamp: str):
        temperature = data.get("temperature")
        level = data.get("level")
        lid = data.get("lid")
        cooling = data.get("cooling", False)
        mode = data.get("mode", "AUTO")
        valid = data.get("valid", True)
        mqtt_status = (data.get("mqtt_status") or "connected").upper()
        kpis = data.get("kpis", {})

        # ---- persist reading ----
        reading = {
            "timestamp": data.get("timestamp", timestamp),
            "temperature": temperature,
            "level": level,
            "lid": lid,
            "lid_state": lid,
            "cooling": cooling,
            "mode": mode,
            "mqtt_status": mqtt_status,
            "valid": valid,
        }
        self.data_service.save_reading(reading)

        # ---- Adafruit IO feeds ----
        if temperature is not None:
            self.adafruit_sim.publish("temperatura-leche", temperature)
        if level is not None:
            self.adafruit_sim.publish("nivel-tanque", level)
        if lid is not None:
            self.adafruit_sim.publish("estado-tapa", lid)
        self.adafruit_sim.publish("refrigeracion", "ON" if cooling else "OFF")
        self.adafruit_sim.publish("control-modo", mode)
        if kpis:
            self.adafruit_sim.publish("temperatura-promedio", kpis.get("avg_temp", 0))
            self.adafruit_sim.publish("temperatura-maxima", kpis.get("max_temp", 0))
            self.adafruit_sim.publish(
                "tiempo-fuera-rango", kpis.get("out_of_range_seconds", 0)
            )

        # ---- alerts (one alert per episode to avoid duplicate flooding) ----
        config = self.data_service.get_configuration()
        warning_temp = config.get("temperature_warning", 6.0)

        if temperature is not None and valid:
            if temperature >= warning_temp:
                if not self._temp_alert_active:
                    self._temp_alert_active = True
                    severity = "critical" if temperature >= warning_temp + 2 else "warning"
                    self.data_service.save_alert(
                        "TEMPERATURA_ALTA",
                        f"Temperatura {temperature}°C excede límite ({warning_temp}°C)",
                        severity,
                    )
                    self.data_service.save_event(
                        "ALERTA_TEMPERATURA",
                        f"Temperatura alta: {temperature}°C",
                        str(temperature),
                    )
            elif temperature < warning_temp - 0.2:
                self._temp_alert_active = False

        # Edge-triggered lid event tracking to prevent event log flooding
        if lid == "OPEN" and self._previous_lid != "OPEN":
            self.data_service.save_event(
                "TAPA_ABIERTA", "La tapa del tanque ha sido abierta (Pérdida térmica acelerada)", "OPEN"
            )
        elif lid == "CLOSED" and self._previous_lid == "OPEN":
            self.data_service.save_event(
                "TAPA_CERRADA", "La tapa del tanque ha sido cerrada (Aislamiento hermético)", "CLOSED"
            )
        if lid:
            self._previous_lid = lid

        if level is not None:
            if level < 20:
                if not self._level_alert_active:
                    self._level_alert_active = True
                    self.data_service.save_alert(
                        "NIVEL_BAJO", f"Nivel del tanque bajo: {level}%", "warning"
                    )
            elif level >= 25:
                self._level_alert_active = False

        if not valid:
            if not self._sensor_invalid_alert_active:
                self._sensor_invalid_alert_active = True
                self.data_service.save_alert(
                    "SENSOR_INVALIDO", "Lectura del sensor inválida", "warning"
                )
                self.data_service.save_event(
                    "SENSOR_ERROR", "Dato de sensor inválido recibido", "N/A"
                )
        else:
            self._sensor_invalid_alert_active = False

        # ---- system state ----
        system_state = "NORMAL"
        if temperature is not None and valid:
            if temperature >= warning_temp:
                system_state = "CRÍTICO"
            elif temperature >= warning_temp - 1:
                system_state = "ADVERTENCIA"
        if not valid:
            system_state = "ADVERTENCIA"

        self._last_status = {
            "esp32_status": "ACTIVE",
            "mqtt_status": "CONNECTED",
            "db_status": "CONNECTED",
            "mode": mode,
            "cooling": cooling,
            "simulation_running": True,
            "simulation_paused": False,
            "system_state": system_state,
            "temperature": temperature,
            "level": level,
            "lid": lid,
            "lid_state": lid,
            "valid": valid,
            "kpis": kpis,
        }

        # ---- WebSocket broadcast ----
        self._broadcast(
            {
                "type": "sensor_update",
                "data": {**reading, "kpis": kpis, "system_state": system_state},
                "timestamp": timestamp,
            }
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _broadcast(self, data: dict):
        """Send to all WebSocket clients from the MQTT thread."""
        try:
            loop = getattr(self.ws_manager, "_loop", None)
            if loop and loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self.ws_manager.broadcast(data), loop
                )
        except Exception:
            pass

    def get_last_status(self) -> dict:
        return self._last_status

    def publish_command(self, topic: str, payload):
        try:
            msg = json.dumps(payload) if isinstance(payload, dict) else str(payload)
            self.client.publish(topic, msg)
        except Exception as e:
            print(f"[BACKEND] MQTT publish error: {e}")

    def get_message_log(self, limit=100) -> list:
        return self.message_log[-limit:]

    def start(self):
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        self.connect()

    def stop(self):
        self.disconnect()
