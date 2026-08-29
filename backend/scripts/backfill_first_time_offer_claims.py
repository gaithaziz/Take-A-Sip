import argparse
import asyncio

from sqlalchemy import and_, or_, select

from app.core.phone import phone_identity_fingerprint
from app.core.database import SessionLocal
from app.models.first_time_offer_claim import FirstTimeOfferClaim
from app.models.order import Order, OrderStatus
from app.models.promotion import Promotion, PromotionType
from app.models.user import User


async def backfill(*, apply: bool) -> tuple[int, int, int]:
    async with SessionLocal() as session:
        result = await session.execute(
            select(User.phone_number)
            .join(Order, Order.user_id == User.id)
            .outerjoin(Promotion, Promotion.id == Order.applied_promotion_id)
            .where(
                or_(
                    Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED]),
                    and_(
                        Order.discount_amount > 0,
                        Promotion.type.in_([PromotionType.FIRST_TIME, PromotionType.FIRST_TIME_FREE_ITEM]),
                    ),
                )
            )
            .distinct()
        )
        fingerprints: set[str] = set()
        skipped = 0
        for phone_number in result.scalars().all():
            try:
                fingerprints.add(phone_identity_fingerprint(phone_number))
            except ValueError:
                skipped += 1
        if not fingerprints:
            return 0, 0, skipped

        existing_result = await session.execute(
            select(FirstTimeOfferClaim.phone_fingerprint).where(
                FirstTimeOfferClaim.phone_fingerprint.in_(fingerprints)
            )
        )
        existing = set(existing_result.scalars().all())
        missing = fingerprints - existing

        if apply:
            session.add_all(
                FirstTimeOfferClaim(phone_fingerprint=fingerprint, reason='historical_backfill')
                for fingerprint in missing
            )
            await session.commit()
        return len(fingerprints), len(missing), skipped


async def main() -> None:
    parser = argparse.ArgumentParser(description='Backfill protected first-offer identity claims.')
    parser.add_argument('--apply', action='store_true', help='Persist missing claims. Without this flag, preview only.')
    args = parser.parse_args()
    eligible, missing, skipped = await backfill(apply=args.apply)
    mode = 'applied' if args.apply else 'preview'
    print(
        f'{mode}: {eligible} historical identities, {missing} missing claims, '
        f'{skipped} invalid legacy placeholders skipped'
    )


if __name__ == '__main__':
    asyncio.run(main())
