from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import get_settings


class SMSProviderError(RuntimeError):
    pass


class SMSProvider:
    async def send_sms(self, phone_number: str, message: str) -> None:
        raise NotImplementedError


class MockSMSProvider(SMSProvider):
    async def send_sms(self, phone_number: str, message: str) -> None:
        # Phase-1 safe default: no external call.
        _ = (phone_number, message)


@dataclass
class TwilioSMSProvider(SMSProvider):
    account_sid: str
    auth_token: str
    from_number: str

    async def send_sms(self, phone_number: str, message: str) -> None:
        url = f'https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json'
        data = {'To': phone_number, 'From': self.from_number, 'Body': message}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, data=data, auth=(self.account_sid, self.auth_token))
        if response.status_code >= 300:
            raise SMSProviderError(f'Twilio send failed: {response.status_code}')



def build_sms_provider() -> SMSProvider:
    settings = get_settings()
    provider = settings.otp_provider.lower().strip()
    if provider == 'twilio':
        if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
            raise SMSProviderError('Twilio provider selected but credentials are missing')
        return TwilioSMSProvider(
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
            from_number=settings.twilio_from_number,
        )
    return MockSMSProvider()
