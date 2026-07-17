from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.notification import (
    PushTokenDeactivateRequest,
    PushTokenRegisterRequest,
    PushTokenResponse,
)
from app.services.notification_service import deactivate_push_token, register_push_token

router = APIRouter(prefix='/notifications', tags=['notifications'])

_SUPPORTED_ROLES = {UserRole.CLIENT, UserRole.ADMIN, UserRole.FRONTDESK, UserRole.DRIVER}


def _ensure_supported_role(current_user: User) -> None:
    if current_user.role not in _SUPPORTED_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Push notifications are not supported')


@router.post('/push-token', response_model=PushTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_push_token_endpoint(
    payload: PushTokenRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PushTokenResponse:
    _ensure_supported_role(current_user)
    token = await register_push_token(db, current_user, payload)
    return PushTokenResponse(token=token)


@router.delete('/push-token', response_model=PushTokenResponse)
async def deactivate_push_token_endpoint(
    payload: PushTokenDeactivateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PushTokenResponse:
    _ensure_supported_role(current_user)
    token = await deactivate_push_token(db, current_user, payload.push_token)
    return PushTokenResponse(token=token)
