# GUION DE DEMOSTRACION
## Sistema IoT - Cadena de Frio de la Leche (Simulacion)
### Duracion aproximada: 5-10 minutos

---

## Paso 1 - Introduccion (1 minuto)
"Este proyecto es una simulacion 100% software de un sistema IoT destinado a monitorear la cadena de frio de la leche."
- Abrir el dashboard en http://localhost:5173
- Señalar los indicadores: ESP32 VIRTUAL, MQTT LOCAL, SIMULACION LOCAL
- Explicar que NO hay hardware fisico, todo es generado por el sistema en local.

## Paso 2 - ESP32 Virtual y Sensores (1 minuto)
- Mostrar el estado ACTIVO del ESP32 virtual.
- Mostrar la temperatura actual.
- Mostrar el nivel del tanque.
- Mostrar el estado de la tapa.
- Explicar que todo es generado por algoritmos en Python.

## Paso 3 - Monitoreo en Tiempo Real (1 minuto)
- Observar el grafico de temperatura.
- Señalar las lineas de referencia en el grafico (3.5 C minimo, 4 C ideal, 6 C maximo).
- Mostrar como los datos llegan continuamente en tiempo real por WebSocket.

## Paso 4 - Escenario de Temperatura Alta (2 minutos)
- Ir a la pagina Simulador en el dashboard.
- Pulsar el boton "Temperatura Alta" para inyectar este escenario.
- Volver al Dashboard principal.
- Observar como la temperatura sube rapidamente de forma simulada.
- Al llegar a 6 C: señalar como se genera la alerta y como la refrigeracion se activa automaticamente.
- Observar el descenso gradual de temperatura de vuelta a niveles seguros.

## Paso 5 - Control Manual (1 minuto)
- Cambiar a modo MANUAL desde la interfaz.
- Pulsar APAGAR REFRIGERACION.
- Observar que la temperatura comienza a subir lentamente.
- Pulsar ENCENDER REFRIGERACION.
- Observar que la temperatura baja.
- Volver a modo AUTOMATICO para dejar el sistema operando.

## Paso 6 - Simulacion de Falla MQTT (1 minuto)
- Pulsar "Desconectar MQTT" en la seccion del simulador.
- Mostrar que el indicador principal cambia a DESCONECTADO.
- Mostrar que el ESP32 virtual SIGUE funcionando localmente y mantiene el control activo.
- Pulsar "Reconectar MQTT".
- Mostrar que el sistema vuelve a la normalidad y se sincroniza.

## Paso 7 — Consola MQTT (1 minuto)
- Ir a la pestaña Consola MQTT.
- Mostrar los mensajes JSON llegando en tiempo real.
- Publicar un mensaje manualmente desde la consola.
- Explicar que esta sección simula la funcionalidad de una app como MyMQTT.

## Paso 8 — KPIs y Alertas (1 minuto)
- Ir a la página de KPIs.
- Mostrar los indicadores clave: temperatura promedio, máxima y tiempo fuera de rango.
- Ir a la página de Alertas.
- Mostrar el historial de alertas generadas durante la demostración (Temperatura Alta, Desconexión, etc.).

## Paso 9 — Gestión del Conocimiento (1 minuto)
- Ir a Gestión del Conocimiento.
- Mostrar la pirámide DIKW estructurada con los datos reales generados en la sesión.
- Mostrar las 7 etapas de la gestión de la información.
- Explicar brevemente cómo se implementa cada etapa en el dashboard y el sistema simulado.

## Paso 10 — Conclusión (30 segundos)
"Esta simulación demuestra el funcionamiento conceptual y lógico del sistema IoT sin necesidad de hardware físico."
- Resaltar que todo es software, facilitando su distribución.
- Mencionar brevemente las tecnologías utilizadas (Docker, Python, FastAPI, React).
