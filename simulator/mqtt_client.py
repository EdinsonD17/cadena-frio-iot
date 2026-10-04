"""
MQTT client wrapper simulator.
"""
# pyrefly: ignore [missing-import]
import paho.mqtt.client as mqtt
import logging

TOPICS = {
    "temperature": "cadena-frio/monitoreo/temperatura",
    "level": "cadena-frio/monitoreo/nivel",
    "lid": "cadena-frio/monitoreo/tapa",
    "cooling": "cadena-frio/control/refrigeracion",
    "mode": "cadena-frio/control/modo",
    "target_temp": "cadena-frio/configuracion/temperatura-objetivo",
    "warning_temp": "cadena-frio/configuracion/limite-advertencia",
    "avg_temp": "cadena-frio/indicadores/temperatura-promedio",
    "max_temp": "cadena-frio/indicadores/temperatura-maxima",
    "out_of_range": "cadena-frio/indicadores/tiempo-fuera-rango",
    "alerts": "cadena-frio/alertas",
}

class SimulatorMQTTClient:
    def __init__(self, broker="localhost", port=1883, client_id="esp32-virtual"):
        self.client = mqtt.Client(client_id=client_id, callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        self.broker = broker
        self.port = port
        self.connected = False
        self.simulated_disconnect = False
        self._on_command_callback = None
        
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
    
    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0 or not getattr(reason_code, "is_failure", True):
            self.connected = True
            self.subscribe_controls()
            print(f"[SIMULATOR] Connected to MQTT broker and subscribed to controls")
        else:
            self.connected = False
            
    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties):
        self.connected = False
        
    def _on_message(self, client, userdata, message):
        try:
            payload = message.payload.decode('utf-8')
            if self._on_command_callback:
                self._on_command_callback(message.topic, payload)
        except Exception as e:
            logging.error(f"Error handling message: {e}")

    def connect(self):
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
        except Exception as e:
            logging.error(f"Failed to connect to MQTT broker: {e}")
            self.connected = False
            
    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()
        self.connected = False
        
    def simulate_disconnect(self):
        self.simulated_disconnect = True
        
    def simulate_reconnect(self):
        self.simulated_disconnect = False
        
    def publish(self, topic_key, value):
        if self.is_available() and topic_key in TOPICS:
            try:
                self.client.publish(TOPICS[topic_key], value)
            except Exception as e:
                pass
                
    def publish_sensor_data(self, temp, level, lid, cooling, mode):
        # Additional convenience method if needed
        pass
        
    def subscribe_controls(self):
        self.client.subscribe("cadena-frio/control/#")
        self.client.subscribe("cadena-frio/configuracion/#")
        self.client.subscribe("cadena-frio/simulation/#")
        self.client.subscribe(TOPICS["cooling"])
        self.client.subscribe(TOPICS["mode"])
        self.client.subscribe(TOPICS["target_temp"])
        self.client.subscribe(TOPICS["warning_temp"])
        self.client.subscribe("cadena-frio/simulation/command")
        
    def set_command_callback(self, callback):
        self._on_command_callback = callback
        
    def is_available(self) -> bool:
        return self.connected and not self.simulated_disconnect
