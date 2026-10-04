@echo off
TITLE Sistema IoT - Cadena de Frio (Simulacion)
set "PATH=C:\Program Files\nodejs;C:\ANACONDA;C:\ANACONDA\Scripts;%PATH%"

echo ========================================================
echo   SISTEMA IoT - CADENA DE FRIO DE LA LECHE
echo   Simulacion 100%% Software (Sin hardware fisico)
echo ========================================================
echo.

echo 1. Iniciando Broker MQTT Local (Puerto 1883)...
start "MQTT Broker" cmd /k "python mqtt_broker.py"

ping -n 4 127.0.0.1 >nul

echo 2. Iniciando Backend FastAPI (Puerto 8000)...
start "Backend FastAPI" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

ping -n 4 127.0.0.1 >nul

echo 3. Iniciando ESP32 Virtual Simulator...
start "ESP32 Virtual" cmd /k "python -m simulator.virtual_esp32"

ping -n 3 127.0.0.1 >nul

echo 4. Iniciando Frontend React / Vite (Puerto 5173)...
start "Frontend React" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Todos los servicios han sido lanzados en ventanas separadas.
echo Abre tu navegador en: http://localhost:5173
echo Backend API Docs en:  http://localhost:8000/docs
echo ========================================================
echo.
pause
