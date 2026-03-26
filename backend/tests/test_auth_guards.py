from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.schemas.auth import VerifyOTPRequest
from app.services.auth_service import verify_otp
from app.services.otp_service import OTPVerifyResult


@pytest.mark.asyncio
async def test_verify_otp_rejects_banned_user() -> None:
    banned_user = SimpleNamespace(
        id='00000000-0000-0000-0000-000000000001',
        first_name='John',
        last_name='Doe',
        phone_number='0790000000',
        role=UserRole.CLIENT,
        is_banned=True,
        is_active=True,
    )
    class FakeResult:
        def scalar_one_or_none(self):
            return banned_user

    class FakeDB:
        async def execute(self, *_args, **_kwargs):
            return FakeResult()

    db = FakeDB()

    payload = VerifyOTPRequest(phone_number='0790000000', otp_code='123456')

    with patch('app.services.auth_service.otp_service.verify', return_value=OTPVerifyResult.SUCCESS):
        with pytest.raises(HTTPException) as exc:
            await verify_otp(payload, db)

    assert exc.value.status_code == 403
    assert exc.value.detail == 'User is banned'


@pytest.mark.asyncio
async def test_verify_otp_rejects_non_client_self_signup() -> None:
    class FakeResult:
        def scalar_one_or_none(self):
            return None

    class FakeDB:
        async def execute(self, *_args, **_kwargs):
            return FakeResult()

    db = FakeDB()

    payload = VerifyOTPRequest(
        phone_number='0790000000',
        otp_code='123456',
        first_name='John',
        last_name='Doe',
        role='DRIVER',
    )

    with patch('app.services.auth_service.otp_service.verify', return_value=OTPVerifyResult.SUCCESS):
        with pytest.raises(HTTPException) as exc:
            await verify_otp(payload, db)

    assert exc.value.status_code == 403
    assert exc.value.detail == 'Only client self-signup is allowed'
