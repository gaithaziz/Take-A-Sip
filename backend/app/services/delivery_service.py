from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.delivery import DeliveryDistanceBand


def _validate_bounds(min_distance_km: Decimal, max_distance_km: Decimal) -> None:
    if min_distance_km < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='min_distance_km must be >= 0')
    if max_distance_km <= min_distance_km:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='max_distance_km must be > min_distance_km'
        )


async def _ensure_no_overlap(
    db: AsyncSession,
    min_distance_km: Decimal,
    max_distance_km: Decimal,
    *,
    exclude_id: UUID | None = None,
    only_active: bool = True,
) -> None:
    overlap_condition = and_(
        DeliveryDistanceBand.min_distance_km < max_distance_km,
        DeliveryDistanceBand.max_distance_km > min_distance_km,
    )
    query = select(DeliveryDistanceBand).where(overlap_condition)
    if exclude_id is not None:
        query = query.where(DeliveryDistanceBand.id != exclude_id)
    if only_active:
        query = query.where(DeliveryDistanceBand.is_active.is_(True))
    result = await db.execute(query.limit(1))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='Active distance bands must not overlap',
        )


async def list_distance_bands(db: AsyncSession) -> list[DeliveryDistanceBand]:
    result = await db.execute(
        select(DeliveryDistanceBand).order_by(
            DeliveryDistanceBand.sort_order.asc(), DeliveryDistanceBand.min_distance_km.asc()
        )
    )
    return list(result.scalars().all())


async def create_distance_band(
    db: AsyncSession,
    min_distance_km: Decimal,
    max_distance_km: Decimal,
    fee_amount: Decimal,
    is_active: bool,
    sort_order: int,
) -> DeliveryDistanceBand:
    _validate_bounds(min_distance_km, max_distance_km)
    if fee_amount < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='fee_amount must be >= 0')
    if is_active:
        await _ensure_no_overlap(db, min_distance_km, max_distance_km)

    band = DeliveryDistanceBand(
        min_distance_km=min_distance_km,
        max_distance_km=max_distance_km,
        fee_amount=fee_amount,
        is_active=is_active,
        sort_order=sort_order,
    )
    db.add(band)
    await db.commit()
    await db.refresh(band)
    return band


async def update_distance_band(
    db: AsyncSession,
    band_id: UUID,
    values: dict,
) -> DeliveryDistanceBand:
    band = await db.get(DeliveryDistanceBand, band_id)
    if band is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Distance band not found')

    for field, value in values.items():
        setattr(band, field, value)

    _validate_bounds(Decimal(band.min_distance_km), Decimal(band.max_distance_km))
    if Decimal(band.fee_amount) < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail='fee_amount must be >= 0')
    if band.is_active:
        await _ensure_no_overlap(
            db, Decimal(band.min_distance_km), Decimal(band.max_distance_km), exclude_id=band.id
        )

    await db.commit()
    await db.refresh(band)
    return band


async def delete_distance_band(db: AsyncSession, band_id: UUID) -> None:
    band = await db.get(DeliveryDistanceBand, band_id)
    if band is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Distance band not found')
    await db.delete(band)
    await db.commit()
