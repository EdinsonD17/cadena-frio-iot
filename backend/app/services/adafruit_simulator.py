"""
Simulador de Adafruit IO — Representación local de feeds.

En esta simulación, Adafruit IO se representa mediante feeds locales
debido a que el proyecto no utiliza servicios externos.
"""
from datetime import datetime
from collections import defaultdict

class AdafruitIOSimulator:
    FEEDS = {
        "temperatura-leche": {"group": "monitoreo", "description": "Temperatura de la leche (°C)"},
        "nivel-tanque": {"group": "monitoreo", "description": "Nivel del tanque (%)"},
        "estado-tapa": {"group": "monitoreo", "description": "Estado de la tapa"},
        "refrigeracion": {"group": "control", "description": "Estado de refrigeración"},
        "control-modo": {"group": "control", "description": "Modo de control"},
        "temperatura-objetivo": {"group": "configuracion", "description": "Temperatura objetivo"},
        "limite-advertencia": {"group": "configuracion", "description": "Límite de advertencia"},
        "temperatura-promedio": {"group": "indicadores", "description": "Temperatura promedio"},
        "temperatura-maxima": {"group": "indicadores", "description": "Temperatura máxima"},
        "tiempo-fuera-rango": {"group": "indicadores", "description": "Tiempo fuera de rango"},
    }
    
    def __init__(self):
        self._data = defaultdict(list)  # feed_key -> [(timestamp, value), ...]
        self._last_value = {}  # feed_key -> value
    
    def publish(self, feed_key: str, value) -> bool:
        if feed_key not in self.FEEDS:
            return False
        timestamp = datetime.now().isoformat()
        self._data[feed_key].append((timestamp, value))
        self._last_value[feed_key] = value
        
        # Keep history bounded
        if len(self._data[feed_key]) > 1000:
            self._data[feed_key] = self._data[feed_key][-1000:]
        return True

    def get_last_value(self, feed_key: str):
        return self._last_value.get(feed_key)
        
    def get_feed_history(self, feed_key: str, limit: int = 100) -> list:
        history = self._data.get(feed_key, [])
        return history[-limit:] if limit > 0 else history
        
    def get_all_feeds(self) -> dict:
        return self.FEEDS
        
    def get_dashboard_data(self) -> dict:
        dashboard = {}
        for feed_key, feed_info in self.FEEDS.items():
            dashboard[feed_key] = {
                "description": feed_info["description"],
                "group": feed_info["group"],
                "last_value": self.get_last_value(feed_key)
            }
        return dashboard
        
    def reset(self):
        self._data.clear()
        self._last_value.clear()
