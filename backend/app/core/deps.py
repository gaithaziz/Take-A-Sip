from collections.abc import Sequence
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User, UserRole

settings = get_settings()
security = HTTPBearer(auto_error=False)
APP_RLS_ROLE = 'take_a_sip_app'


async def _activate_rls_context(db: AsyncSession, user: User) -> None:
    await db.execute(
        text(
            "select set_config('app.current_user_id', :user_id, false), set_config('app.current_user_role', :user_role, false)"
        ),
        {'user_id': str(user.id), 'user_role': user.role.value},
    )

    role_exists = await db.execute(text('select exists(select 1 from pg_roles where rolname = :role_name)'), {'role_name': APP_RLS_ROLE})
    if role_exists.scalar_one():
        await db.execute(text(f'SET ROLE {APP_RLS_ROLE}'))


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing token')

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = UUID(payload['sub'])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User is banned')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='User inactive')

    await _activate_rls_context(db, user)
    return user


def require_roles(*roles: UserRole):
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        allowed: Sequence[UserRole] = roles
        if current_user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
        return current_user

    return checker
