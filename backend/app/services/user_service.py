from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_event import UserEvent


async def list_users(
    db: AsyncSession,
    search: str | None = None,
    banned: bool | None = None,
) -> list[User]:
    query = select(User).order_by(User.created_at.desc())

    if search:
        token = f'%{search.strip()}%'
        query = query.where(
            or_(
                User.first_name.ilike(token),
                User.last_name.ilike(token),
                User.phone_number.ilike(token),
            )
        )

    if banned is not None:
        query = query.where(User.is_banned.is_(banned))

    result = await db.execute(query)
    return list(result.scalars().all())


async def ban_user(
    db: AsyncSession,
    target_user_id: UUID,
    actor_user_id: UUID,
    reason: str | None,
) -> User:
    result = await db.execute(select(User).where(User.id == target_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    user.is_banned = True
    user.banned_at = datetime.now(timezone.utc)
    user.banned_reason = reason
    db.add(
        UserEvent(
            user_id=user.id,
            event_type='user.banned',
            actor_user_id=actor_user_id,
            reason=reason,
        )
    )
    await db.commit()
    await db.refresh(user)
    return user


async def unban_user(db: AsyncSession, target_user_id: UUID, actor_user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == target_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    user.is_banned = False
    user.banned_at = None
    user.banned_reason = None
    db.add(
        UserEvent(
            user_id=user.id,
            event_type='user.unbanned',
            actor_user_id=actor_user_id,
            reason=None,
        )
    )
    await db.commit()
    await db.refresh(user)
    return user
