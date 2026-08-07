from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.store_settings import StoreSettings


async def get_store_settings(
    db: AsyncSession,
    *,
    for_update: bool = False,
    for_share: bool = False,
) -> StoreSettings | None:
    query = select(StoreSettings).order_by(StoreSettings.updated_at.desc()).limit(1)
    if for_update:
        query = query.with_for_update()
    elif for_share:
        query = query.with_for_update(read=True)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def set_ordering_enabled(db: AsyncSession, *, ordering_enabled: bool, actor_user_id: UUID) -> StoreSettings:
    settings_row = await get_store_settings(db, for_update=True)
    if settings_row is None:
        settings = get_settings()
        settings_row = StoreSettings(
            store_name='Take A Sip',
            store_latitude=Decimal(str(settings.store_latitude or 32.551347)),
            store_longitude=Decimal(str(settings.store_longitude or 36.017005)),
        )
        db.add(settings_row)

    settings_row.ordering_enabled = ordering_enabled
    settings_row.ordering_updated_by_user_id = actor_user_id
    await db.commit()
    await db.refresh(settings_row)
    return settings_row


async def ensure_ordering_enabled(db: AsyncSession) -> None:
    # A shared lock lets orders proceed concurrently while ensuring that a
    # store-closing update waits for already-started order transactions.
    settings_row = await get_store_settings(db, for_share=True)
    if settings_row is not None and not settings_row.ordering_enabled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Ordering is currently unavailable',
        )
