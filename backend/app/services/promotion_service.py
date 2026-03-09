from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.promotion import LoyaltyRule, Promotion


async def get_active_promotions(db: AsyncSession) -> list[Promotion]:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Promotion).where(
            and_(
                Promotion.is_active.is_(True),
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
        )
    )
    return list(result.scalars().all())


async def list_promotions(db: AsyncSession) -> list[Promotion]:
    result = await db.execute(select(Promotion).order_by(Promotion.starts_at.desc()))
    return list(result.scalars().all())


async def list_loyalty_rules(db: AsyncSession) -> list[LoyaltyRule]:
    result = await db.execute(select(LoyaltyRule).order_by(LoyaltyRule.required_orders.asc()))
    return list(result.scalars().all())
