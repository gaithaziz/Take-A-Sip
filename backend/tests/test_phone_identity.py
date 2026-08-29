from unittest.mock import AsyncMock

import pytest

from app.core.phone import canonicalize_phone_identity, phone_identity_fingerprint
from app.services.offer_identity_service import has_first_time_offer_claim


def test_jordanian_mobile_formats_share_offer_identity() -> None:
    formats = ['0791234567', '791234567', '+962791234567', '00962791234567']

    assert {canonicalize_phone_identity(value) for value in formats} == {'+962791234567'}
    assert len({phone_identity_fingerprint(value) for value in formats}) == 1


def test_offer_identity_fingerprint_does_not_expose_phone_number() -> None:
    fingerprint = phone_identity_fingerprint('+962791234567')

    assert len(fingerprint) == 64
    assert '791234567' not in fingerprint


@pytest.mark.asyncio
async def test_invalid_legacy_phone_is_not_welcome_offer_eligible() -> None:
    db = AsyncMock()

    assert await has_first_time_offer_claim(db, 'deleted-user-placeholder') is True
    db.execute.assert_not_awaited()
