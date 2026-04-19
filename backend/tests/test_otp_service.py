import pytest

from app.services.otp_service import OTPRateLimitError, OTPService, OTPVerifyResult


class FakeSession:
    def __init__(self) -> None:
        self.storage = {}

    async def get(self, model, key, with_for_update=None):
        _ = (model, with_for_update)
        return self.storage.get(key)

    def add(self, instance) -> None:
        self.storage[instance.phone_number] = instance

    async def delete(self, instance) -> None:
        self.storage.pop(instance.phone_number, None)

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None


def _build_service() -> OTPService:
    service = OTPService()
    service._settings.environment = 'test'
    service._settings.otp_test_code = '123456'
    service._settings.otp_ttl_minutes = 5
    service._settings.otp_resend_cooldown_seconds = 30
    service._settings.otp_max_verify_attempts = 2
    service._settings.otp_lock_minutes = 1
    service.reset()
    return service


@pytest.mark.asyncio
async def test_generate_and_store_enforces_resend_cooldown() -> None:
    service = _build_service()
    session = FakeSession()
    await service.generate_and_store(session, '+962790000111')

    with pytest.raises(OTPRateLimitError) as exc:
        await service.generate_and_store(session, '+962790000111')

    assert exc.value.retry_after_seconds >= 1


@pytest.mark.asyncio
async def test_verify_locks_after_max_invalid_attempts() -> None:
    service = _build_service()
    session = FakeSession()
    await service.generate_and_store(session, '+962790000111')

    assert await service.verify(session, '+962790000111', '000000') == OTPVerifyResult.INVALID
    assert await service.verify(session, '+962790000111', '111111') == OTPVerifyResult.LOCKED
    assert await service.verify(session, '+962790000111', '123456') == OTPVerifyResult.LOCKED


@pytest.mark.asyncio
async def test_verify_succeeds_from_a_new_service_instance() -> None:
    session = FakeSession()
    sender_service = _build_service()
    await sender_service.generate_and_store(session, '+962790000111')
    otp_code = sender_service.peek_code_for_tests('+962790000111')

    verifier_service = _build_service()
    assert otp_code is not None
    assert await verifier_service.verify(session, '+962790000111', otp_code) == OTPVerifyResult.SUCCESS
