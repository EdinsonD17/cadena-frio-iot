from fastapi import APIRouter, HTTPException, Request, Body
from typing import Optional

router = APIRouter(prefix="/api")

@router.get("/status")
def get_status(request: Request):
    last = request.app.state.mqtt_handler.get_last_status()
    lid_val = last.get("lid") or last.get("lid_state") or "CLOSED"
    return {
        "esp32_status": last.get("esp32_status", "ACTIVE"),
        "mqtt_status": "CONNECTED" if request.app.state.mqtt_handler.connected else "DISCONNECTED",
        "db_status": "CONNECTED",
        "mode": last.get("mode", "AUTO"),
        "cooling": last.get("cooling", False),
        "simulation_running": last.get("simulation_running", False),
        "simulation_paused": last.get("simulation_paused", False),
        "system_state": last.get("system_state", "NORMAL"),
        "temperature": last.get("temperature"),
        "level": last.get("level"),
        "lid": lid_val,
        "lid_state": lid_val,
    }

@router.get("/sensors/current")
def get_current_sensors(request: Request):
    return request.app.state.data_service.get_current_reading()

@router.get("/sensors/history")
def get_sensor_history(request: Request, minutes: Optional[int] = None):
    return request.app.state.data_service.get_history(minutes)

@router.get("/telemetry/history")
def get_telemetry_history(request: Request, minutes: Optional[int] = 15):
    return request.app.state.data_service.get_telemetry_history(minutes)

@router.get("/kpis")
def get_kpis(request: Request, minutes: Optional[int] = None):
    return request.app.state.data_service.calculate_kpis(minutes)

@router.get("/events")
def get_events(request: Request, limit: int = 100):
    return request.app.state.data_service.get_events(limit)

@router.get("/alerts")
def get_alerts(request: Request, status: Optional[str] = None, limit: int = 100):
    return request.app.state.data_service.get_alerts(status, limit)

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(request: Request, alert_id: int):
    request.app.state.data_service.acknowledge_alert(alert_id)
    return {"status": "success"}

@router.get("/configuration")
def get_configuration(request: Request):
    return request.app.state.data_service.get_configuration()

@router.put("/configuration")
def update_configuration(request: Request, config: dict):
    request.app.state.data_service.update_configuration(config)
    
    # Notify MQTT
    if "temperature_target" in config:
        request.app.state.mqtt_handler.publish_command("cadena-frio/configuracion/temperatura-objetivo", {"value": config["temperature_target"]})
    if "temperature_warning" in config:
        request.app.state.mqtt_handler.publish_command("cadena-frio/configuracion/limite-advertencia", {"value": config["temperature_warning"]})
        
    return {"status": "success"}

from datetime import datetime

@router.post("/control/mode")
def set_control_mode(request: Request, payload: dict = Body(...)):
    mode = payload.get("value")
    if mode not in ["AUTO", "MANUAL"]:
        raise HTTPException(status_code=400, detail="Invalid mode")
    request.app.state.mqtt_handler.publish_command("cadena-frio/control/modo", {"value": mode})
    last = request.app.state.mqtt_handler._last_status
    last["mode"] = mode
    request.app.state.mqtt_handler._broadcast({
        "type": "sensor_update",
        "data": {**last},
        "timestamp": datetime.now().isoformat()
    })
    return {"status": "success"}

@router.post("/control/refrigeration")
def set_refrigeration(request: Request, payload: dict = Body(...)):
    val = payload.get("value")
    if val not in ["ON", "OFF"]:
        raise HTTPException(status_code=400, detail="Invalid value")
    request.app.state.mqtt_handler.publish_command("cadena-frio/control/refrigeracion", {"value": val})
    last = request.app.state.mqtt_handler._last_status
    last["cooling"] = (val == "ON")
    request.app.state.mqtt_handler._broadcast({
        "type": "sensor_update",
        "data": {**last},
        "timestamp": datetime.now().isoformat()
    })
    return {"status": "success"}

# SIMULATION CONTROL
def send_sim_command(request: Request, command: str, value=None):
    payload = {"command": command}
    if value is not None:
        payload["value"] = value
    request.app.state.mqtt_handler.publish_command("cadena-frio/simulation/command", payload)

    last = request.app.state.mqtt_handler._last_status
    if command == "open-lid":
        last["lid"] = "OPEN"
        last["lid_state"] = "OPEN"
    elif command == "close-lid":
        last["lid"] = "CLOSED"
        last["lid_state"] = "CLOSED"
    elif command == "high-temperature":
        last["temperature"] = 7.5
        last["system_state"] = "CRÍTICO"
        last["cooling"] = True
    elif command == "low-level":
        last["level"] = 15.0
    elif command == "set-temp" and value is not None:
        last["temperature"] = float(value)
        if float(value) >= 6.0:
            last["system_state"] = "CRÍTICO"
            last["cooling"] = True
        elif float(value) <= 3.5:
            last["cooling"] = False
    elif command == "set-level" and value is not None:
        last["level"] = float(value)
    elif command == "reset":
        last["temperature"] = 4.0
        last["level"] = 80.0
        last["lid"] = "CLOSED"
        last["lid_state"] = "CLOSED"
        last["cooling"] = False
        last["system_state"] = "NORMAL"

    request.app.state.mqtt_handler._broadcast({
        "type": "sensor_update",
        "data": {**last},
        "timestamp": datetime.now().isoformat()
    })
    return {"status": "success", "command": command}

@router.post("/simulation/start")
def sim_start(request: Request): return send_sim_command(request, "start")

@router.post("/simulation/pause")
def sim_pause(request: Request): return send_sim_command(request, "pause")

@router.post("/simulation/reset")
def sim_reset(request: Request):
    request.app.state.data_service.clear_all()
    request.app.state.adafruit_sim.reset()
    return send_sim_command(request, "reset")

@router.post("/simulation/high-temperature")
def sim_high_temp(request: Request): return send_sim_command(request, "high-temperature")

@router.post("/simulation/open-lid")
def sim_open_lid(request: Request): return send_sim_command(request, "open-lid")

@router.post("/simulation/close-lid")
def sim_close_lid(request: Request): return send_sim_command(request, "close-lid")

@router.post("/simulation/low-level")
def sim_low_level(request: Request): return send_sim_command(request, "low-level")

@router.post("/simulation/invalid-sensor")
def sim_invalid_sensor(request: Request): return send_sim_command(request, "invalid-sensor")

@router.post("/simulation/valid-sensor")
def sim_valid_sensor(request: Request): return send_sim_command(request, "valid-sensor")

@router.post("/simulation/mqtt-disconnect")
def sim_mqtt_disconnect(request: Request): return send_sim_command(request, "mqtt-disconnect")

@router.post("/simulation/mqtt-reconnect")
def sim_mqtt_reconnect(request: Request): return send_sim_command(request, "mqtt-reconnect")

@router.post("/simulation/set-temp")
def sim_set_temp(request: Request, payload: dict = Body(...)):
    val = payload.get("value", 4.0)
    return send_sim_command(request, "set-temp", value=val)

@router.post("/simulation/set-level")
def sim_set_level(request: Request, payload: dict = Body(...)):
    val = payload.get("value", 80.0)
    return send_sim_command(request, "set-level", value=val)

# MQTT CONSOLE
@router.get("/mqtt/messages")
def get_mqtt_messages(request: Request, limit: int = 100):
    return request.app.state.mqtt_handler.get_message_log(limit)

@router.post("/mqtt/publish")
def mqtt_publish(request: Request, payload: dict = Body(...)):
    topic = payload.get("topic")
    message = payload.get("message")
    if not topic or message is None:
        raise HTTPException(status_code=400, detail="Missing topic or message")
    request.app.state.mqtt_handler.publish_command(topic, message if isinstance(message, dict) else {"value": message})
    return {"status": "success"}

# ADAFRUIT IO SIMULATOR
@router.get("/adafruit/feeds")
def get_adafruit_feeds(request: Request):
    return request.app.state.adafruit_sim.get_dashboard_data()

@router.get("/adafruit/feeds/{feed_key}")
def get_adafruit_feed_history(request: Request, feed_key: str, limit: int = 100):
    return request.app.state.adafruit_sim.get_feed_history(feed_key, limit)
