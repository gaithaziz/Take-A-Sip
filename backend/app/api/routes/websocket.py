from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select, text

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.websocket.manager import frontdesk_channel, manager

router = APIRouter(tags=['websocket'])
settings = get_settings()


@router.websocket('/ws/frontdesk')
async def frontdesk_ws(websocket: WebSocket) -> None:
    auth_header = websocket.headers.get('authorization')
    token = None
    if auth_header:
        scheme, _, credentials = auth_header.partition(' ')
        if scheme.lower() == 'bearer' and credentials:
            token = credentials.strip()
    if not token:
        token = websocket.query_params.get('token')
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = UUID(payload['sub'])
        role = payload.get('role')
        if role not in {UserRole.FRONTDESK.value, UserRole.ADMIN.value}:
            await websocket.close(code=1008)
            return
        async with SessionLocal() as session:
            await session.execute(text("select set_config('app.current_user_role', 'ADMIN', true)"))
            await session.execute(text("select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000000', true)"))
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user is None or not user.is_active or user.is_banned:
                await websocket.close(code=1008)
                return
    except JWTError:
        await websocket.close(code=1008)
        return
    except (ValueError, KeyError):
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, frontdesk_channel())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, frontdesk_channel())
