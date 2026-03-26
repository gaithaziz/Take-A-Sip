from app.services.otp_service import OTPRateLimitError, OTPService, OTPVerifyResult


def _build_service() -> OTPService:
    service = OTPService()
    service._settings.otp_test_code = '123456'
    service._settings.otp_ttl_minutes = 5
    service._settings.otp_resend_cooldown_seconds = 30
    service._settings.otp_max_verify_attempts = 2
    service._settings.otp_lock_minutes = 1
    service.reset()
    return service


def test_generate_and_store_enforces_resend_cooldown() -> None:
    service = _build_service()
    service.generate_and_store('+962790000111')

    try:
        service.generate_and_store('+962790000111')
    except OTPRateLimitError as exc:
        assert exc.retry_after_seconds >= 1
    else:
        raise AssertionError('Expected OTPRateLimitError')


def test_verify_locks_after_max_invalid_attempts() -> None:
    service = _build_service()
    service.generate_and_store('+962790000111')

    assert service.verify('+962790000111', '000000') == OTPVerifyResult.INVALID
    assert service.verify('+962790000111', '111111') == OTPVerifyResult.LOCKED
    assert service.verify('+962790000111', '123456') == OTPVerifyResult.LOCKED
