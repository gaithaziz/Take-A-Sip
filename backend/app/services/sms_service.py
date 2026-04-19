from __future__ import annotations

import json
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


@dataclass
class MersalSMSProvider(SMSProvider):
    api_url: str
    api_key: str
    sender_id: str | None
    auth_header: str
    auth_scheme: str
    phone_field: str
    message_field: str
    sender_field: str
    extra_payload_json: str | None

    def _payload(self, phone_number: str, message: str) -> dict:
        payload = {}
        if self.extra_payload_json:
            try:
                parsed = json.loads(self.extra_payload_json)
            except json.JSONDecodeError as exc:
                raise SMSProviderError('Mersal extra payload is not valid JSON') from exc
            if not isinstance(parsed, dict):
                raise SMSProviderError('Mersal extra payload must be a JSON object')
            payload.update(parsed)

        payload[self.phone_field] = phone_number
        payload[self.message_field] = message
        if self.sender_id:
            payload[self.sender_field] = self.sender_id
        return payload

    def _headers(self) -> dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        key = self.api_key.strip()
        scheme = self.auth_scheme.strip()
        if scheme:
            headers[self.auth_header] = f'{scheme} {key}'
        else:
            headers[self.auth_header] = key
        return headers

    async def send_sms(self, phone_number: str, message: str) -> None:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                self.api_url,
                json=self._payload(phone_number, message),
                headers=self._headers(),
            )
        if response.status_code >= 300:
            raise SMSProviderError(f'Mersal send failed: {response.status_code} {response.text[:200]}')



def build_sms_provider() -> SMSProvider:
    settings = get_settings()
    provider = settings.otp_provider.lower().strip()
    if provider == 'mersal':
        if not (settings.mersal_api_url and settings.mersal_api_key):
            raise SMSProviderError('Mersal provider selected but credentials are missing')
        return MersalSMSProvider(
            api_url=settings.mersal_api_url,
            api_key=settings.mersal_api_key,
            sender_id=settings.mersal_sender_id,
            auth_header=settings.mersal_auth_header,
            auth_scheme=settings.mersal_auth_scheme,
            phone_field=settings.mersal_phone_field,
            message_field=settings.mersal_message_field,
            sender_field=settings.mersal_sender_field,
            extra_payload_json=settings.mersal_extra_payload_json,
        )
    if provider == 'twilio':
        if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
            raise SMSProviderError('Twilio provider selected but credentials are missing')
        return TwilioSMSProvider(
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
            from_number=settings.twilio_from_number,
        )
    return MockSMSProvider()
