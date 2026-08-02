from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set

router = APIRouter()

active_connections: Set[WebSocket] = set()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        for connection in active_connections:
            await connection.send_json({"online_users": len(active_connections)})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        for connection in list(active_connections):
            try:
                await connection.send_json({"online_users": len(active_connections)})
            except Exception:
                pass
