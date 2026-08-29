from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.phone import phone_identity_fingerprint
from app.models.first_time_offer_claim import FirstTimeOfferClaim


async def has_first_time_offer_claim(db: AsyncSession, phone_number: str) -> bool:
    try:
        fingerprint = phone_identity_fingerprint(phone_number)
    except ValueError:
        # Legacy anonymized placeholders must never regain welcome eligibility.
        return True
    result = await db.execute(
        select(FirstTimeOfferClaim.phone_fingerprint).where(
            FirstTimeOfferClaim.phone_fingerprint == fingerprint
        )
    )
    return result.scalar_one_or_none() is not None


async def claim_first_time_identity(
    db: AsyncSession,
    phone_number: str,
    *,
    reason: str,
) -> FirstTimeOfferClaim | None:
    try:
        fingerprint = phone_identity_fingerprint(phone_number)
    except ValueError:
        return None
    statement = (
        insert(FirstTimeOfferClaim)
        .values(phone_fingerprint=fingerprint, reason=reason)
        .on_conflict_do_nothing(index_elements=[FirstTimeOfferClaim.phone_fingerprint])
        .returning(FirstTimeOfferClaim.phone_fingerprint)
    )
    result = await db.execute(statement)
    if result.scalar_one_or_none() is None:
        return None
    return await db.get(FirstTimeOfferClaim, fingerprint)


def attach_claim_to_order(claim: FirstTimeOfferClaim, order_id: UUID) -> None:
    claim.source_order_id = order_id
