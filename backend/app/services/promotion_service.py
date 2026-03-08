from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.promotion import Promotion


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
