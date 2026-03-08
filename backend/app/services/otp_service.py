from datetime import datetime, timedelta, timezone
from secrets import randbelow

from app.core.config import get_settings


class OTPService:
    def __init__(self) -> None:
        self._store: dict[str, tuple[str, datetime]] = {}
        self._settings = get_settings()

    def generate_and_store(self, phone_number: str) -> str:
        code = self._settings.otp_test_code
        if not code:
            code = f'{randbelow(900000) + 100000}'
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self._settings.otp_ttl_minutes)
        self._store[phone_number] = (code, expires_at)
        return code

    def verify(self, phone_number: str, otp_code: str) -> bool:
        entry = self._store.get(phone_number)
        if not entry:
            return False
        code, expires_at = entry
        if datetime.now(timezone.utc) > expires_at:
            self._store.pop(phone_number, None)
            return False
        if code != otp_code:
            return False
        self._store.pop(phone_number, None)
        return True


otp_service = OTPService()
