from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from uuid import UUID

from app.core.config import Settings
from app.models.user import User, UserRole
from app.models.user_push_token import UserPushToken
from app.schemas.notification import PushTokenRegisterRequest
from app.schemas.auth import SendOTPRequest
from app.schemas.auth import KioskLoginRequest
from app.services.notification_service import register_push_token
from app.services.auth_service import kiosk_login, send_otp
from app.services.sms_service import SMSProviderError


@pytest.mark.asyncio
async def test_send_otp_clears_failed_delivery_challenge() -> None:
    db = object()
    payload = SendOTPRequest(
        phone_number='+962790000111',
        first_name='Nora',
        last_name='Ali',
    )
    provider = AsyncMock()
    provider.send_sms.side_effect = SMSProviderError('failed')

    with patch('app.services.auth_service.build_sms_provider', return_value=provider):
        with patch(
            'app.services.auth_service.otp_service.generate_and_store',
            new=AsyncMock(return_value='123456'),
        ) as generate_mock:
            with patch(
                'app.services.auth_service.otp_service.clear_challenge',
                new=AsyncMock(),
            ) as clear_mock:
                with pytest.raises(HTTPException) as exc:
                    await send_otp(payload, db)

    assert exc.value.status_code == 503
    generate_mock.assert_awaited_once_with(db, payload.phone_number)
    clear_mock.assert_awaited_once_with(db, payload.phone_number)


@pytest.mark.asyncio
async def test_send_otp_bypass_skips_sms_delivery() -> None:
    db = object()
    payload = SendOTPRequest(
        phone_number='+962790000222',
        first_name='Test',
        last_name='Driver',
    )
    settings = Settings(
        otp_bypass_enabled=True,
        otp_bypass_code='000000',
        otp_bypass_accounts={'+962790000222': 'DRIVER'},
    )

    with patch('app.services.auth_service.settings', settings):
        with patch('app.services.auth_service.build_sms_provider') as provider_mock:
            with patch(
                'app.services.auth_service.otp_service.generate_and_store',
                new=AsyncMock(),
            ) as generate_mock:
                code = await send_otp(payload, db)

    assert code == '000000'
    provider_mock.assert_not_called()
    generate_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_send_otp_bypass_accepts_local_jordan_phone_format() -> None:
    db = object()
    payload = SendOTPRequest(
        phone_number='0790000222',
        first_name='Test',
        last_name='Driver',
    )
    settings = Settings(
        otp_bypass_enabled=True,
        otp_bypass_code='000000',
        otp_bypass_accounts={'+962790000222': 'DRIVER'},
    )

    with patch('app.services.auth_service.settings', settings):
        with patch('app.services.auth_service.build_sms_provider') as provider_mock:
            code = await send_otp(payload, db)

    assert code == '000000'
    provider_mock.assert_not_called()


@pytest.mark.asyncio
async def test_kiosk_login_returns_frontdesk_token() -> None:
    db = AsyncMock()
    user = User(
        id=UUID('0d15bd53-e6bd-467d-969e-999be51a40cd'),
        first_name='Front',
        last_name='Desk',
        phone_number='0790000001',
        role=UserRole.FRONTDESK,
        is_active=True,
        is_banned=False,
    )
    db_result = MagicMock()
    db_result.scalar_one_or_none.return_value = user
    db.execute = AsyncMock(return_value=db_result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    settings = Settings(
        kiosk_login_secret='sunmi-secret',
        kiosk_frontdesk_phone_number='0790000001',
    )

    with patch('app.services.auth_service.get_settings', return_value=settings):
        response = await kiosk_login(KioskLoginRequest(secret='sunmi-secret'), db)

    assert response.user.phone_number == '0790000001'
    assert response.user.role == 'FRONTDESK'
    assert response.access_token
    assert response.refresh_token
    assert db.execute.await_count == 3


@pytest.mark.asyncio
async def test_register_push_token_uses_idempotent_upsert() -> None:
    user = User(
        id=UUID('0d15bd53-e6bd-467d-969e-999be51a40cd'),
        first_name='Admin',
        last_name='Owner',
        phone_number='0790000000',
        role=UserRole.ADMIN,
        is_active=True,
        is_banned=False,
    )
    token = UserPushToken(
        id=UUID('11111111-1111-1111-1111-111111111111'),
        user_id=user.id,
        platform='ios',
        push_provider='apns',
        push_token='duplicate-push-token',
        device_id='device-a',
        language='en',
        is_active=True,
    )
    db = AsyncMock()
    db_result = MagicMock()
    db_result.scalar_one.return_value = token.id
    db.execute = AsyncMock(return_value=db_result)
    db.commit = AsyncMock()
    db.get = AsyncMock(return_value=token)

    response = await register_push_token(
        db,
        user,
        PushTokenRegisterRequest(
            push_token='duplicate-push-token',
            platform='ios',
            push_provider='apns',
            device_id='device-a',
            language='ar',
        ),
    )

    statements = [str(call.args[0]) for call in db.execute.await_args_list]
    statement = next(statement for statement in statements if 'ON CONFLICT' in statement)
    assert 'ON CONFLICT' in str(statement)
    assert response.id == token.id
    db.commit.assert_awaited_once()
    assert any('current_setting' in statement for statement in statements)
    assert any('set_config' in statement for statement in statements)
