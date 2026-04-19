from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.schemas.auth import SendOTPRequest
from app.services.auth_service import send_otp
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
