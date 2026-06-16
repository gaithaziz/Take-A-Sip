from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.core.config import Settings
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

    with patch('app.services.auth_service.otp_service.verify', new=AsyncMock(return_value=OTPVerifyResult.SUCCESS)):
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

    with patch('app.services.auth_service.otp_service.verify', new=AsyncMock(return_value=OTPVerifyResult.SUCCESS)):
        with pytest.raises(HTTPException) as exc:
            await verify_otp(payload, db)

    assert exc.value.status_code == 403
    assert exc.value.detail == 'Only client self-signup is allowed'


@pytest.mark.asyncio
async def test_verify_otp_uses_privileged_rls_context_for_self_signup() -> None:
    class FakeResult:
        def scalar_one_or_none(self):
            return None

    db = AsyncMock()
    db.execute.return_value = FakeResult()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.refresh.side_effect = lambda user: setattr(user, 'id', UUID('00000000-0000-0000-0000-000000000123'))

    payload = VerifyOTPRequest(
        phone_number='0790000000',
        otp_code='123456',
        first_name='فارس',
        last_name='ابو ختلة',
    )

    with patch('app.services.auth_service.otp_service.verify', new=AsyncMock(return_value=OTPVerifyResult.SUCCESS)):
        await verify_otp(payload, db)

    first_execute = db.execute.await_args_list[0]
    assert 'app.current_user_role' in str(first_execute.args[0])
    assert first_execute.args[1]['user_role'] == UserRole.ADMIN.value


@pytest.mark.asyncio
async def test_verify_otp_bypass_returns_configured_driver_without_otp_check() -> None:
    driver_user = SimpleNamespace(
        id=UUID('00000000-0000-0000-0000-000000000222'),
        first_name='Test',
        last_name='Driver',
        phone_number='+962790000222',
        role=UserRole.DRIVER,
        is_banned=False,
        is_active=True,
    )

    class FakeResult:
        def scalar_one_or_none(self):
            return driver_user

    db = AsyncMock()
    db.execute.side_effect = [MagicMock(), FakeResult()]
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    settings = Settings(
        otp_bypass_enabled=True,
        otp_bypass_code='000000',
        otp_bypass_accounts={'+962790000222': 'DRIVER'},
    )
    payload = VerifyOTPRequest(phone_number='+962790000222', otp_code='000000')

    with patch('app.services.auth_service.settings', settings):
        with patch('app.services.auth_service.otp_service.verify', new=AsyncMock()) as verify_mock:
            response = await verify_otp(payload, db)

    verify_mock.assert_not_awaited()
    assert response.user.phone_number == '+962790000222'
    assert response.user.role == 'DRIVER'
    assert response.access_token
    assert response.refresh_token


@pytest.mark.asyncio
async def test_verify_otp_bypass_local_jordan_phone_uses_canonical_account() -> None:
    driver_user = SimpleNamespace(
        id=UUID('00000000-0000-0000-0000-000000000222'),
        first_name='Test',
        last_name='Driver',
        phone_number='+962790000222',
        role=UserRole.DRIVER,
        is_banned=False,
        is_active=True,
    )

    class FakeResult:
        def scalar_one_or_none(self):
            return driver_user

    db = AsyncMock()
    db.execute.side_effect = [MagicMock(), FakeResult()]
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    settings = Settings(
        otp_bypass_enabled=True,
        otp_bypass_code='000000',
        otp_bypass_accounts={'+962790000222': 'DRIVER'},
    )
    payload = VerifyOTPRequest(phone_number='0790000222', otp_code='000000')

    with patch('app.services.auth_service.settings', settings):
        with patch('app.services.auth_service.otp_service.verify', new=AsyncMock()) as verify_mock:
            response = await verify_otp(payload, db)

    verify_mock.assert_not_awaited()
    select_statement = db.execute.await_args_list[1].args[0]
    assert '+962790000222' in str(select_statement.compile(compile_kwargs={'literal_binds': True}))
    assert response.user.phone_number == '+962790000222'
    assert response.user.role == 'DRIVER'


@pytest.mark.asyncio
async def test_verify_otp_bypass_wrong_code_uses_normal_otp_path() -> None:
    class FakeResult:
        def scalar_one_or_none(self):
            return None

    class FakeDB:
        async def execute(self, *_args, **_kwargs):
            return FakeResult()

    settings = Settings(
        otp_bypass_enabled=True,
        otp_bypass_code='000000',
        otp_bypass_accounts={'+962790000222': 'DRIVER'},
    )
    payload = VerifyOTPRequest(phone_number='+962790000222', otp_code='111111')

    with patch('app.services.auth_service.settings', settings):
        with patch('app.services.auth_service.otp_service.verify', new=AsyncMock(return_value=OTPVerifyResult.INVALID)) as verify_mock:
            with pytest.raises(HTTPException) as exc:
                await verify_otp(payload, FakeDB())

    verify_mock.assert_awaited_once()
    assert exc.value.status_code == 400
    assert exc.value.detail == 'Invalid OTP'
