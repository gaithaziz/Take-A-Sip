import json
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket

from app.models.user import UserRole
from app.schemas.websocket import OrderEventMessage


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        await websocket.accept()
        self.connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str) -> None:
        self.connections[channel].discard(websocket)

    async def broadcast(self, channel: str, payload: dict) -> None:
        stale: list[WebSocket] = []
        for connection in self.connections[channel]:
            try:
                await connection.send_text(json.dumps(payload, default=str))
            except Exception:
                stale.append(connection)
        for dead in stale:
            self.connections[channel].discard(dead)


manager = ConnectionManager()


def frontdesk_channel() -> str:
    return 'frontdesk'


def order_event_payload(event: str, order_id: UUID, order_number: int, status: str) -> dict:
    return OrderEventMessage(
        event=event,
        order_id=order_id,
        order_number=order_number,
        status=status,
    ).model_dump(mode='json')
