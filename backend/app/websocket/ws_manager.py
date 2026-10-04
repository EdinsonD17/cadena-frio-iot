from fastapi import WebSocket
import asyncio, json

class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._loop = None
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, data: dict):
        message = json.dumps(data)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    def broadcast_sync(self, data: dict):
        """Called from non-async context (MQTT handler thread)"""
        if not self._loop:
            return
            
        try:
            if self._loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(data), self._loop)
            else:
                self._loop.run_until_complete(self.broadcast(data))
        except RuntimeError:
            pass  # No event loop available
