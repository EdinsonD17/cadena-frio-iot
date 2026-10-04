from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.database.connection import init_db
from app.services.data_service import DataService
from app.services.adafruit_simulator import AdafruitIOSimulator
from app.mqtt.mqtt_handler import MQTTHandler
from app.websocket.ws_manager import WebSocketManager
from app.api.routes import router

ws_manager = WebSocketManager()
data_service = DataService()
adafruit_sim = AdafruitIOSimulator()
mqtt_handler = MQTTHandler(data_service, adafruit_sim, ws_manager)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    mqtt_handler.start()
    
    app.state.data_service = data_service
    app.state.adafruit_sim = adafruit_sim
    app.state.mqtt_handler = mqtt_handler
    app.state.ws_manager = ws_manager
    
    try:
        ws_manager._loop = asyncio.get_event_loop()
    except RuntimeError:
        pass
        
    yield
    
    mqtt_handler.stop()

app = FastAPI(
    title="Sistema IoT - Cadena de Frío de la Leche (Simulación)",
    description="Backend para simulación 100% software del sistema IoT",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Can handle incoming WS data here if needed
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
