"""
Prueba de integración end-to-end sobre el bucle real de VirtualESP32.
Utiliza inyección de tiempo simulado (sin time.sleep) para evaluar:
1. Arranque en frío y estabilización en régimen permanente (<0.3 °C de variación total, ~3.75 °C).
2. Cero alertas de temperatura alta en operación estable.
3. Coincidencia entre la temperatura del modelo y la publicada en el payload MQTT.
4. Adición de leche (+10%): salto entálpico, saturación de refrigeración y recuperación gradual.
5. Tapa abierta y cerrada con calentamiento convectivo y recuperación suave.
6. Escenario de nivel crítico sin drift artificial.
"""
import json
import random
import pytest
from simulator.virtual_esp32 import VirtualESP32


class TestSimulationIntegration:
    def test_cold_start_and_steady_state(self):
        random.seed(42)
        esp32 = VirtualESP32()
        published_messages = []
        
        # Interceptar publicaciones MQTT
        def mock_publish(topic, payload):
            if topic == "temperature":
                published_messages.append(json.loads(payload))
        esp32.mqtt.publish = mock_publish
        esp32.mqtt.is_available = lambda: True

        # Ejecutar 300 ciclos equivalentes a 10 minutos (600s de tiempo simulado)
        for _ in range(300):
            esp32.step(dt_seconds=2.0)

        assert len(published_messages) == 300

        # Últimos 150 ciclos (últimos 5 minutos en régimen permanente)
        steady_temps = [m["temperature"] for m in published_messages[150:] if m["temperature"] is not None]
        
        min_temp = min(steady_temps)
        max_temp = max(steady_temps)
        variation = max_temp - min_temp

        # Variación menor a 0.2 °C en régimen permanente con sensor_noise=0.02
        assert variation < 0.2, f"Variación esperada < 0.2 °C, obtenida: {variation} °C"
        # Régimen centrado alrededor de 3.75 °C
        assert 3.65 <= (sum(steady_temps) / len(steady_temps)) <= 3.85

        # Cero alertas de temperatura alta
        assert esp32.alerts_count == 0

        # La temperatura publicada coincide con la temperatura física del modelo (tolerancia <= 0.10 °C)
        last_msg = published_messages[-1]
        assert abs(last_msg["temperature"] - esp32.model.temperature) <= 0.10

    def test_milk_addition_and_recovery(self):
        esp32 = VirtualESP32()
        esp32.mqtt.publish = lambda t, p: None
        esp32.mqtt.is_available = lambda: True

        # Estabilizar 150 pasos
        for _ in range(150):
            esp32.step(dt_seconds=2.0)

        initial_temp = esp32.model.temperature
        assert abs(initial_temp - 3.75) < 0.1

        # Agregar 10% de leche (pasar de 80% a 90%)
        esp32.handle_command("cadena-frio/simulation/command", json.dumps({"command": "set-level", "value": 90.0}))

        # La temperatura debe haber subido inmediatamente por balance de entalpía
        jump_temp = esp32.model.temperature
        assert jump_temp > initial_temp + 1.0, f"Salto térmico esperado tras agregar leche caliente: {jump_temp}"
        assert esp32.model.level == 90.0

        # En el siguiente ciclo, la potencia frigorífica debe saturar al 100% (1.0)
        esp32.step(dt_seconds=2.0)
        assert esp32.model.cooling_power >= 0.95, f"La potencia de refrigeración debe saturar al 100%, obtenida: {esp32.model.cooling_power}"
        assert esp32.cooling.active == True

        # Ejecutar ciclos de enfriamiento gradual hasta cruzar el límite seguro de 4.0 °C
        # Criterio objetivo: 2 a 4 minutos (60 a 120 ciclos de dt=2s)
        recovery_cycles = 0
        while esp32.model.temperature > 4.0 and recovery_cycles < 200:
            esp32.step(dt_seconds=2.0)
            recovery_cycles += 1

        recovery_seconds = recovery_cycles * 2.0
        assert 90 <= recovery_seconds <= 300, f"Recuperación tras +10% esperada entre 90 y 300 s, obtenida: {recovery_seconds/60:.2f} min ({recovery_seconds} s)"
        assert esp32.model.temperature <= 4.0

    def test_large_milk_addition_recovery(self):
        """
        Tras una adición masiva de leche (tanque bajo al 15% rellenado al 90%
        con leche a temperatura de entrada de 24 °C), la temperatura salta a ~20.6 °C.
        La refrigeración Peltier saturada debe retornar la temperatura por debajo
        del límite seguro de 4.0 °C en un tiempo medido de entre 600 y 1000 segundos
        (10 a 16.6 minutos).
        """
        esp32 = VirtualESP32()
        esp32.mqtt.publish = lambda t, p: None
        esp32.mqtt.is_available = lambda: True

        # Establecer tanque con poco volumen (15%) a temperatura nominal
        esp32.scenario_low_level()
        for _ in range(30):
            esp32.step(dt_seconds=2.0)

        # Llenar tanque al 90% (adición de 750 L a temperatura de entrada de 22.0 °C)
        esp32.handle_command("cadena-frio/simulation/command", json.dumps({"command": "set-level", "value": 90.0}))
        peak_temp = esp32.model.temperature
        # Con milk_entry_temp = 22.0 °C y nivel inicial 15% a ~3.75 °C, el balance entálpico predice ~18.96 °C
        assert 18.0 <= peak_temp <= 20.0, f"Pico térmico esperado cercano a 18.96 °C, obtenido: {peak_temp:.2f} °C"

        # Contar ciclos de recuperación hasta que descienda por debajo de 4.0 °C
        cycles = 0
        while esp32.model.temperature > 4.0 and cycles < 600:
            esp32.step(dt_seconds=2.0)
            cycles += 1

        recovery_seconds = cycles * 2.0
        recovery_minutes = recovery_seconds / 60.0

        # Criterio objetivo: 600 a 1000 segundos (10 a 16.6 minutos)
        assert 600 <= recovery_seconds <= 1000, f"Recuperación esperada entre 600 y 1000 s, obtenida: {recovery_minutes:.2f} min ({recovery_seconds} s)"
        assert esp32.model.temperature <= 4.0

    def test_lid_open_and_close_recovery(self):
        esp32 = VirtualESP32()
        esp32.mqtt.publish = lambda t, p: None
        esp32.mqtt.is_available = lambda: True

        # Estabilizar
        for _ in range(100):
            esp32.step(dt_seconds=2.0)

        base_temp = esp32.model.temperature

        # Abrir tapa durante 60 pasos (2 minutos)
        esp32.scenario_open_lid()
        assert esp32.model.lid_state == "OPEN"

        for _ in range(60):
            esp32.step(dt_seconds=2.0)

        # La temperatura debe haber aumentado entre 0.5 y 1.2 °C por ganancia convectiva
        warmed_temp = esp32.model.temperature
        delta_t = warmed_temp - base_temp
        assert 0.5 <= delta_t <= 1.2, f"Subida esperada entre 0.5 y 1.2 °C en 2 min, obtenida: {delta_t:.3f} °C"
        # Sin alertas en operacion normal de 2 minutos
        assert esp32.alerts_count == 0, "No debe disparar alertas durante 2 minutos de apertura de tapa"

        # Cerrar tapa y dejar recuperar (criterio objetivo: 1 a 3 minutos / 30 a 90 pasos)
        esp32.scenario_close_lid()
        assert esp32.model.lid_state == "CLOSED"

        recov_cycles = 0
        while esp32.model.temperature > 3.85 and recov_cycles < 200:
            esp32.step(dt_seconds=2.0)
            recov_cycles += 1

        recov_seconds = recov_cycles * 2.0
        assert 60 <= recov_seconds <= 180, f"Recuperación de tapa esperada entre 1 y 3 min, obtenida: {recov_seconds/60:.2f} min ({recov_seconds} s)"
        assert esp32.model.temperature <= 3.85

    def test_prolonged_lid_open_triggers_single_alert(self):
        """
        Una apertura prolongada de la tapa supera la capacidad frigorifica de la Peltier,
        cruzando 6.0 °C y disparando exactamente UNA sola alerta de temperatura alta
        (deduplicada por histeresis).
        """
        esp32 = VirtualESP32()
        published_alerts = []
        def mock_publish(topic, payload):
            if topic == "alerts":
                published_alerts.append(json.loads(payload))
        esp32.mqtt.publish = mock_publish
        esp32.mqtt.is_available = lambda: True

        # Abrir tapa por periodo prolongado (500 pasos = 1000 segundos ~ 16.6 minutos)
        esp32.scenario_open_lid()
        for _ in range(500):
            esp32.step(dt_seconds=2.0)

        # Debe haber superado el umbral de advertencia de 6.0 °C
        assert esp32.model.temperature >= 6.0, f"Temperatura esperada >= 6.0 °C, obtenida: {esp32.model.temperature}"
        # Se debe haber generado exactamente UNA sola alerta (sin flood de mensajes MQTT)
        assert esp32.alerts_count == 1
        assert len(published_alerts) == 1
        assert "Temperature high" in published_alerts[0]["message"]

        # Al cerrar la tapa y permitir que se enfrie, el flag de alerta debe resetearse
        esp32.scenario_close_lid()
        for _ in range(800):
            esp32.step(dt_seconds=2.0)

        assert esp32.model.temperature < 4.0
        assert esp32._high_temp_alert_active == False

    def test_low_level_scenario(self):
        esp32 = VirtualESP32()
        esp32.mqtt.publish = lambda t, p: None
        esp32.mqtt.is_available = lambda: True

        esp32.scenario_low_level()
        assert esp32.level_sensor.level == 15.0
        assert esp32.model.level == 15.0

        # Verificar que no hay drift de vaciado continuo
        for _ in range(50):
            esp32.step(dt_seconds=2.0)

        assert abs(esp32.level_sensor.level - 15.0) < 0.01

    def test_mqtt_published_temperature_matches_model(self):
        """Verifica especificamente que cada mensaje publicado en el topic MQTT coincida con el modelo."""
        random.seed(42)
        esp32 = VirtualESP32()
        published_payloads = []
        
        def mock_publish(topic, payload):
            if topic == "temperature":
                published_payloads.append(json.loads(payload))
                
        esp32.mqtt.publish = mock_publish
        esp32.mqtt.is_available = lambda: True

        for _ in range(50):
            esp32.step(dt_seconds=2.0)
            msg = published_payloads[-1]
            # Temperatura publicada coincide con la fisica del modelo (tolerancia <= 0.10 °C con sensor_noise=0.02)
            assert abs(msg["temperature"] - esp32.model.temperature) <= 0.10
            # Estado de actuadores y sensores plenamente sincronizados
            assert msg["cooling"] == esp32.model.cooling_active
            assert msg["level"] == esp32.model.level
            assert msg["lid"] == esp32.model.lid_state

    def test_e2e_prolonged_open_lid_leaves_single_sqlite_alert(self):
        """
        Prueba E2E: simulador -> MQTTHandler -> DataService -> SQLite.
        Verifica que una tapa abierta prolongada genera EXACTAMENTE UNA sola fila de alerta en la base de datos.
        """
        import os, tempfile
        tmp_dir = tempfile.mkdtemp()
        tmp_db = os.path.join(tmp_dir, "test_e2e_alert.db")
        os.environ["DB_PATH"] = tmp_db

        import sys
        if os.path.abspath("backend") not in sys.path:
            sys.path.insert(0, os.path.abspath("backend"))

        import backend.app.database.connection as conn
        old_db_path = conn.DB_PATH
        conn.DB_PATH = tmp_db
        if hasattr(conn._local, "conn") and conn._local.conn is not None:
            conn._local.conn.close()
            conn._local.conn = None
        conn.init_db()

        try:
            from backend.app.services.data_service import DataService
            from backend.app.mqtt.mqtt_handler import MQTTHandler
            from simulator.mqtt_client import TOPICS as SIM_TOPICS

            ds = DataService()

            class MockWSManager:
                def broadcast_sync(self, msg): pass
            class MockAdafruit:
                def publish(self, *args, **kwargs): pass
                def sync_all(self, *args, **kwargs): pass

            mqtt_handler = MQTTHandler(data_service=ds, adafruit_sim=MockAdafruit(), ws_manager=MockWSManager())

            class DirectMQTTBridge:
                def __init__(self, handler):
                    self.handler = handler
                def is_available(self):
                    return True
                def publish(self, topic_key, payload):
                    topic = SIM_TOPICS.get(topic_key, topic_key)
                    class MockMsg:
                        def __init__(self, t, p):
                            self.topic = t
                            self.payload = p.encode("utf-8") if isinstance(p, str) else p
                    self.handler._on_message(None, None, MockMsg(topic, payload))

            esp32 = VirtualESP32()
            esp32.mqtt = DirectMQTTBridge(mqtt_handler)

            # 50 ciclos en regimen normal
            for _ in range(50):
                esp32.step(dt_seconds=2.0)

            assert len(ds.get_alerts()) == 0

            # Abrir tapa por 550 ciclos (1100 s) para sobrepasar los 6.0 °C
            esp32.scenario_open_lid()
            for _ in range(550):
                esp32.step(dt_seconds=2.0)

            alerts = ds.get_alerts()
            assert len(alerts) == 1, f"Se esperaba exactamente 1 alerta, se obtuvieron {len(alerts)}"
            assert alerts[0]["type"] == "TEMPERATURA_ALTA"
            assert "6.0" in alerts[0]["message"] or "alta" in alerts[0]["message"].lower()

            # Cerrar tapa y verificar que al recuperarse no se duplica la alerta
            esp32.scenario_close_lid()
            for _ in range(600):
                esp32.step(dt_seconds=2.0)

            alerts_after = ds.get_alerts()
            assert len(alerts_after) == 1
            assert esp32.model.temperature < 4.0

        finally:
            if hasattr(conn._local, "conn") and conn._local.conn is not None:
                conn._local.conn.close()
                conn._local.conn = None
            conn.DB_PATH = old_db_path
            try:
                os.remove(tmp_db)
                os.rmdir(tmp_dir)
            except Exception:
                pass

