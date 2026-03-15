from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.user import User, UserRole
from app.models.user_event import UserEvent


async def list_users(
    db: AsyncSession,
    search: str | None = None,
    banned: bool | None = None,
    role: str | None = None,
    is_active: bool | None = None,
) -> list[tuple[User, int]]:
    order_count = func.count(Order.id).label('order_count')
    query = (
        select(User, order_count)
        .outerjoin(Order, Order.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )

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
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))

    result = await db.execute(query)
    return [(row[0], int(row[1])) for row in result.all()]


async def list_drivers(
    db: AsyncSession,
    search: str | None = None,
    is_active: bool | None = None,
    include_banned: bool = False,
) -> list[User]:
    query = select(User).where(User.role == UserRole.DRIVER).order_by(User.created_at.desc())
    if search:
        token = f'%{search.strip()}%'
        query = query.where(
            or_(
                User.first_name.ilike(token),
                User.last_name.ilike(token),
                User.phone_number.ilike(token),
            )
        )
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
    if not include_banned:
        query = query.where(User.is_banned.is_(False))
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


async def provision_staff_user(
    db: AsyncSession,
    *,
    first_name: str,
    last_name: str,
    phone_number: str,
    role: str,
    actor_user_id: UUID,
) -> tuple[User, bool]:
    role_enum = UserRole(role)
    if role_enum == UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Role is not allowed')

    normalized_phone = phone_number.strip()
    existing = await db.execute(select(User).where(User.phone_number == normalized_phone))
    user = existing.scalar_one_or_none()
    created = False
    if user is None:
        user = User(
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            phone_number=normalized_phone,
            role=role_enum,
            is_active=True,
            is_banned=False,
        )
        db.add(user)
        await db.flush()
        created = True
    else:
        user.first_name = first_name.strip()
        user.last_name = last_name.strip()
        user.role = role_enum
        user.is_active = True
        user.is_banned = False
        user.banned_reason = None
        user.banned_at = None

    db.add(
        UserEvent(
            user_id=user.id,
            event_type='user.staff_provisioned',
            actor_user_id=actor_user_id,
            reason=f'role:{role_enum.value}',
        )
    )
    await db.commit()
    await db.refresh(user)
    return user, created
