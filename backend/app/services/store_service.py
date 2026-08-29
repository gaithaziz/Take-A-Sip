from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.store_settings import StoreSettings
from app.schemas.store import StoreSettingsUpdate

STORE_TIMEZONE = 'Asia/Amman'


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


def _parse_time(value: str) -> time:
    return time.fromisoformat(value)


def _interval_for_day(day: date, entry: dict, timezone: ZoneInfo) -> tuple[datetime, datetime] | None:
    if not entry.get('is_open') or not entry.get('opens_at') or not entry.get('closes_at'):
        return None
    start = datetime.combine(day, _parse_time(entry['opens_at']), timezone)
    end = datetime.combine(day, _parse_time(entry['closes_at']), timezone)
    if end <= start:
        end += timedelta(days=1)
    return start, end


def evaluate_working_hours(
    working_hours: list[dict] | None,
    *,
    now: datetime | None = None,
) -> tuple[bool, datetime | None, datetime | None, datetime | None]:
    if working_hours is None:
        return True, None, None, None
    timezone = ZoneInfo(STORE_TIMEZONE)
    current = now.astimezone(timezone) if now else datetime.now(timezone)
    by_day = {int(entry['day_of_week']): entry for entry in working_hours}

    for day_offset in (-1, 0):
        candidate_day = current.date() + timedelta(days=day_offset)
        entry = by_day.get(candidate_day.weekday())
        interval = _interval_for_day(candidate_day, entry, timezone) if entry else None
        if interval and interval[0] <= current < interval[1]:
            return True, interval[0], None, interval[1]

    for day_offset in range(0, 8):
        candidate_day = current.date() + timedelta(days=day_offset)
        entry = by_day.get(candidate_day.weekday())
        interval = _interval_for_day(candidate_day, entry, timezone) if entry else None
        if interval and interval[0] > current:
            return False, None, interval[0], interval[0]
    return False, None, None, None


def store_status_payload(settings_row: StoreSettings | None, *, now: datetime | None = None) -> dict:
    ordering_enabled = settings_row.ordering_enabled if settings_row else True
    working_hours = settings_row.working_hours if settings_row else None
    within_hours, current_open_at, next_open_at, next_status_change_at = evaluate_working_hours(working_hours, now=now)
    unavailable_reason = None
    if not ordering_enabled:
        unavailable_reason = 'MANUAL_PAUSE'
    elif not within_hours:
        unavailable_reason = 'OUTSIDE_WORKING_HOURS'
    return {
        'ordering_enabled': ordering_enabled,
        'accepting_orders': ordering_enabled and within_hours,
        'unavailable_reason': unavailable_reason,
        'timezone': STORE_TIMEZONE,
        'working_hours': working_hours,
        'current_open_at': current_open_at,
        'next_open_at': next_open_at,
        'next_status_change_at': next_status_change_at,
        'minimum_delivery_order_amount': (
            settings_row.minimum_delivery_order_amount if settings_row else Decimal('0.00')
        ),
        'minimum_pickup_order_amount': (
            getattr(settings_row, 'minimum_pickup_order_amount', Decimal('0.00'))
            if settings_row
            else Decimal('0.00')
        ),
        'updated_at': settings_row.updated_at if settings_row else None,
        'updated_by_user_id': settings_row.ordering_updated_by_user_id if settings_row else None,
    }


async def update_store_settings(
    db: AsyncSession,
    *,
    payload: StoreSettingsUpdate,
    actor_user_id: UUID,
) -> StoreSettings:
    settings_row = await get_store_settings(db, for_update=True)
    if settings_row is None:
        settings = get_settings()
        settings_row = StoreSettings(
            store_name='Take A Sip',
            store_latitude=Decimal(str(settings.store_latitude or 32.551347)),
            store_longitude=Decimal(str(settings.store_longitude or 36.017005)),
        )
        db.add(settings_row)
    values = payload.model_dump(exclude_unset=True)
    if values.get('ordering_enabled') is None:
        values.pop('ordering_enabled', None)
    if values.get('minimum_delivery_order_amount') is None:
        values.pop('minimum_delivery_order_amount', None)
    if values.get('minimum_pickup_order_amount') is None:
        values.pop('minimum_pickup_order_amount', None)
    if 'working_hours' in values and values['working_hours'] is not None:
        values['working_hours'] = [entry.model_dump() if hasattr(entry, 'model_dump') else entry for entry in payload.working_hours or []]
    for field, value in values.items():
        setattr(settings_row, field, value)
    settings_row.ordering_updated_by_user_id = actor_user_id
    await db.commit()
    await db.refresh(settings_row)
    return settings_row


async def ensure_ordering_enabled(db: AsyncSession) -> StoreSettings | None:
    # A shared lock lets orders proceed concurrently while ensuring that a
    # store-closing update waits for already-started order transactions.
    settings_row = await get_store_settings(db, for_share=True)
    status_payload = store_status_payload(settings_row)
    if not status_payload['accepting_orders']:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                'Store is outside working hours'
                if status_payload['unavailable_reason'] == 'OUTSIDE_WORKING_HOURS'
                else 'Ordering is currently unavailable'
            ),
        )
    return settings_row


def ensure_order_minimum(settings_row: StoreSettings | None, *, order_type: str, subtotal: Decimal) -> None:
    if settings_row is None:
        minimum = Decimal('0.00')
    elif order_type == 'delivery':
        minimum = getattr(settings_row, 'minimum_delivery_order_amount', Decimal('0.00'))
    else:
        minimum = getattr(settings_row, 'minimum_pickup_order_amount', Decimal('0.00'))
    if minimum > 0 and subtotal < minimum:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'{order_type.capitalize()} order subtotal is below the minimum',
        )


def ensure_delivery_minimum(settings_row: StoreSettings | None, *, order_type: str, subtotal: Decimal) -> None:
    """Backward-compatible alias for callers using the previous helper name."""
    ensure_order_minimum(settings_row, order_type=order_type, subtotal=subtotal)
