import pytest

from app.services.promotion_rules_service import (
    eligible_for_first_time_offer,
    eligible_for_loyalty_offer,
)


def test_first_time_offer_eligibility() -> None:
    assert eligible_for_first_time_offer(0) is True
    assert eligible_for_first_time_offer(1) is False


def test_loyalty_offer_eligibility() -> None:
    assert eligible_for_loyalty_offer(5, 5) is True
    assert eligible_for_loyalty_offer(10, 5) is True
    assert eligible_for_loyalty_offer(4, 5) is False
    assert eligible_for_loyalty_offer(0, 5) is False
    assert eligible_for_loyalty_offer(10, 0) is False
