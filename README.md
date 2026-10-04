# SISTEMA IoT - CADENA DE FRIO DE LA LECHE

## Simulacion 100% Software

> NOTA IMPORTANTE: Este proyecto es exclusivamente una simulacion software.
> No existe conexion con sensores, ESP32, reles, Peltier u otros dispositivos fisicos.

### Descripcion
Este proyecto es una simulacion academica de un sistema IoT para el monitoreo de la cadena de frio de la leche. Permite visualizar como un dispositivo ESP32 leeria datos de sensores de temperatura, nivel y estado de la tapa, y como interactuaria con un sistema de refrigeracion utilizando comunicacion MQTT.

### Arquitectura

#### Sistema Real vs. Simulacion

| Sistema Real | Simulacion |
|---|---|
| DS18B20 | Sensor virtual (algoritmo en Python) |
| Sensor Ultrasonico | Sensor virtual (nivel simulado) |
| Interruptor Magnetico | Sensor de estado (Abierto/Cerrado) |
| ESP32 | ESP32 virtual (programa Python) |
| MQTT -> Adafruit IO | MQTT local (Mosquitto) -> Adafruit IO simulado |
| MyMQTT (App) | Consola MQTT virtual en Dashboard |
| Rele + Peltier | Actuador virtual (etapa de potencia modulada) |

#### Diagrama de Arquitectura
```text
SENSORES VIRTUALES -> ESP32 VIRTUAL -> MQTT LOCAL -> BACKEND (FastAPI) -> SQLite -> DASHBOARD (React/Vite)
```

### Tecnologias

| Componente | Tecnologia |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| Base de Datos | SQLite (WAL mode) |
| MQTT Broker | Mosquitto (Eclipse) / Broker Python |
| Simulador | Python, Paho-MQTT |
| Frontend | React, Vite, CSS moderno |
| Despliegue | Docker, Docker Compose |

---

### Como ejecutar localmente

#### Opcion 1: Script de Inicio Rapido (Windows)
Ejecutar el archivo por lotes en la raiz del proyecto:
```cmd
start_local.bat
```
Este script inicializa en ventanas independientes:
1. El broker MQTT local (puerto 1883).
2. El backend FastAPI (puerto 8000).
3. El simulador VirtualESP32 (publicando telemetria cada 2 segundos).
4. El servidor de desarrollo de Vite (puerto 5173).

#### Opcion 2: Docker Compose
Para compilar y levantar todos los contenedores en segundo plano:
```bash
docker compose up --build
```
Para forzar una reconstruccion completa y limpia ignorando la cache de capas:
```bash
docker compose build --no-cache
docker compose up
```

#### Opcion 3: Ejecucion Manual por Servicios
1. **MQTT Broker**: Iniciar Mosquitto o el broker local:
   ```bash
   python mqtt_broker.py
   ```
2. **Backend**:
   ```bash
   uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
   ```
3. **Simulador**:
   ```bash
   python -m simulator.virtual_esp32
   ```
4. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

### Como reiniciar limpio sin dejar procesos huerfanos

Cuando se interrumpe la ejecucion manual o ocurren bloqueos de puertos, es fundamental cerrar los procesos remanentes:

#### En Windows (Consola de Comandos o PowerShell):
1. **Identificar los PIDs de los procesos en los puertos del proyecto:**
   ```cmd
   netstat -ano | findstr :8000
   netstat -ano | findstr :1883
   netstat -ano | findstr :5173
   ```
   La ultima columna de cada linea corresponde al numero de PID del proceso en escucha.

2. **Terminar exclusivamente el proceso asociado al PID identificado:**
   ```cmd
   taskkill /PID <numero_pid> /F
   ```

   ADVERTENCIA: No utilizar "taskkill /F /IM python.exe" ni "taskkill /F /IM node.exe". El uso de "/IM" finaliza de forma indiscriminada todos los procesos de Python o Node en el sistema, interrumpiendo otros proyectos, servicios del sistema o entornos de desarrollo activos en la maquina.

#### En Docker:
Para detener y retirar los contenedores y redes del proyecto de forma segura:
```bash
docker compose down
```

ADVERTENCIA: No utilizar "docker compose down -v" en la operacion normal. La bandera "-v" elimina los volumenes persistentes asociados a los contenedores, lo que destruye la base de datos SQLite y borra permanentemente todo el historial de telemetria y alertas acumulado.

---

### Parametros del modelo termico

La fisica de transferencia de calor y el control frigorifico estan centralizados en la clase `ThermalConfig` dentro de `simulator/thermal_model.py`.

A continuacion se detallan los parametros configurables y su impacto en la simulacion:

* **Consignas y limites regulatorios:**
  * `ambient_temp` (25.0 C): Temperatura ambiente del recinto. Rige la tasa de transferencia de calor por conduccion y conveccion pasiva hacia el tanque.
  * `control_setpoint` (3.75 C): Punto de consigna del controlador PI.
  * `target_temp` (4.0 C): Limite superior de la franja ideal de conservacion de leche pasteurizada.
  * `cooling_off_temp` (3.5 C): Limite inferior de consigna.
  * `warning_temp` (6.0 C): Umbral critico regulatorio; por encima de este valor se activan las alertas del sistema.

* **Dimensiones del tanque y caracteristicas de la leche:**
  * `tank_capacity_liters` (1000.0 L): Capacidad volumetrica util del tanque isotermico.
  * `milk_density` (1.03 kg/L): Densidad de la leche entera para el calculo de masa e inercia termica ($m = V \times \rho$).
  * `milk_entry_temp` (22.0 C): Temperatura a la que ingresa la leche fresca cruda al tanque en eventos de llenado o recarga parcial.

* **Coeficientes de transferencia de calor:**
  * `base_heat_gain_coeff` (0.00008 por ciclo de 2s a 80% de nivel): Coeficiente de transferencia conductiva a traves de las paredes aisladas con tapa cerrada.
  * `lid_open_factor` (31.0): Factor multiplicativo del coeficiente termico convectivo cuando la tapa se encuentra abierta. Con 2 minutos de apertura genera un calentamiento de +0.5 a +1.0 C; en apertura prolongada supera la potencia frigorifica maxima para inducir una excursion termica realista.
  * `cooling_power_coeff` (0.045 C por ciclo de 2s): Capacidad frigorifica maxima de extraccion a potencia plena (acelerada 3.75x para facilitar la validacion y demostracion agil).
  * `sensor_noise` (0.02 C): Desviacion estandar del ruido Gaussiano de medicion del sensor de temperatura DS18B20.

* **Lazo de control PI:**
  * `kp` (1.2): Ganancia proporcional.
  * `ki` (0.0002): Ganancia integral.
  * `u_base` (0.0378): Potencia frigorifica en equilibrio nominal para contrarrestar la entrada pasiva de calor ambiental a 3.75 C.
  * `integral_min` (-0.04) / `integral_max` (0.15): Limites de saturacion con anti-windup para el acumulador integral.

---

### Sugerencias futuras para el backend

* **Persistencia de episodios de alerta:**
  Actualmente, las banderas de deteccion por flanco de episodios de alerta (`_temp_alert_active` y `_previous_lid` en `backend/app/mqtt/mqtt_handler.py`) residen en la memoria de la aplicacion y se reinician si el proceso del backend se reinicia. En un entorno productivo de alta concurrencia o microservicios distribuidos, se recomienda almacenar el estado activo del episodio en una tabla de SQLite o un cache en Redis con tiempo de expiracion.

---

### Componentes

- **ESP32 Virtual**: Script en Python que simula la lectura de sensores y control del sistema.
- **Sensores Virtuales**: Algoritmos que generan datos de temperatura (con ruido estocastico y balances de entalpia), nivel de tanque y estado de la tapa.
- **MQTT Local**: Broker Mosquitto / broker Python utilizado para la comunicacion entre el simulador y el backend.
- **Backend (API + WebSocket)**: Recibe los datos MQTT, los guarda en base de datos SQLite y los transmite al frontend via WebSocket.
- **Dashboard**: Interfaz web interactiva que expone graficas en tiempo real, tabla de telemetria, controles del simulador y visor de alertas.

### KPIs Monitoreados
- **Temperatura Promedio**: Media movil ponderada de las ultimas lecturas.
- **Temperatura Maxima**: Registro del valor pico registrado en la sesion.
- **Tiempo Fuera de Rango**: Segundos acumulados con temperatura superior al limite de 6.0 C.
- **Calidad de Senal**: Porcentaje de lecturas validas vs lecturas con error.

### Alertas
- **TEMPERATURA_ALTA**: Notificacion cuando la temperatura excede 6.0 C (clasificada como warning o critical segun el delta).
- **SENSOR_INVALID**: Deteccion de desconexion o valor fuera de escala (-40 C a +80 C).
- **CONEXION_PERDIDA**: Deteccion de caida de conectividad con el broker MQTT.

### Pruebas
Para ejecutar la suite completa de pruebas unitarias y de integracion:
```bash
python -m pytest tests/ -v
```

### LIMITACIONES DEL PROTOTIPO
"Este proyecto es exclusivamente una simulacion software. No existe conexion con sensores, ESP32, reles, Peltier u otros dispositivos fisicos."
- Los datos generados son datos simulados mediante balances termicos y modelos de inercia.
- Las metas de validacion corresponden al prototipo de software.
- No se realizaron mediciones fisicas en laboratorio.
- No se conectaron actuadores reales ni hardware embebido.
- Los resultados tienen caracter pedagogico y demostrativo.

### Gestion del Conocimiento
Implementacion de la piramide DIKW:
1. **Datos**: Mediciones brutas simuladas (temperatura, nivel, estado de tapa).
2. **Informacion**: Curvas termicas temporales, clasificacion por colores e indicadores KPI.
3. **Conocimiento**: Correlacion de apertura de tapa y vaciado con variaciones de entalpia.
4. **Sabiduria**: Modulacion PI automatica de la potencia frigorifica y generacion de alertas tempranas.

### Creditos
Proyecto academico para la materia IoT. Simulacion de Cadena de Frio.
