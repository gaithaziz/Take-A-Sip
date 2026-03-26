from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from hashlib import sha256
from hmac import compare_digest
from secrets import randbelow

from app.core.config import get_settings


class OTPVerifyResult(str, Enum):
    SUCCESS = 'success'
    NOT_FOUND = 'not_found'
    EXPIRED = 'expired'
    INVALID = 'invalid'
    LOCKED = 'locked'


class OTPRateLimitError(RuntimeError):
    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__('OTP request rate-limited')


@dataclass
class OTPChallenge:
    code_hash: str
    expires_at: datetime
    resend_available_at: datetime
    attempts_remaining: int
    locked_until: datetime | None = None


class OTPService:
    def __init__(self) -> None:
        self._store: dict[str, OTPChallenge] = {}
        self._debug_codes: dict[str, str] = {}
        self._settings = get_settings()

    @staticmethod
    def _hash_code(code: str) -> str:
        return sha256(code.encode('utf-8')).hexdigest()

    def _clear_challenge(self, phone_number: str) -> None:
        self._store.pop(phone_number, None)
        self._debug_codes.pop(phone_number, None)

    def generate_and_store(self, phone_number: str) -> str:
        now = datetime.now(timezone.utc)
        challenge = self._store.get(phone_number)
        if challenge is not None:
            if challenge.locked_until is not None and now < challenge.locked_until:
                retry_after = max(int((challenge.locked_until - now).total_seconds()), 1)
                raise OTPRateLimitError(retry_after)
            if now < challenge.resend_available_at:
                retry_after = max(int((challenge.resend_available_at - now).total_seconds()), 1)
                raise OTPRateLimitError(retry_after)

        code = self._settings.otp_test_code
        if not code:
            code = f'{randbelow(900000) + 100000}'
        self._store[phone_number] = OTPChallenge(
            code_hash=self._hash_code(code),
            expires_at=now + timedelta(minutes=self._settings.otp_ttl_minutes),
            resend_available_at=now + timedelta(seconds=self._settings.otp_resend_cooldown_seconds),
            attempts_remaining=self._settings.otp_max_verify_attempts,
        )
        self._debug_codes[phone_number] = code
        return code

    def verify(self, phone_number: str, otp_code: str) -> OTPVerifyResult:
        challenge = self._store.get(phone_number)
        if challenge is None:
            return OTPVerifyResult.NOT_FOUND

        now = datetime.now(timezone.utc)
        if challenge.locked_until is not None and now < challenge.locked_until:
            return OTPVerifyResult.LOCKED
        if now > challenge.expires_at:
            self._clear_challenge(phone_number)
            return OTPVerifyResult.EXPIRED
        if compare_digest(challenge.code_hash, self._hash_code(otp_code)):
            self._clear_challenge(phone_number)
            return OTPVerifyResult.SUCCESS

        challenge.attempts_remaining -= 1
        if challenge.attempts_remaining <= 0:
            challenge.locked_until = now + timedelta(minutes=self._settings.otp_lock_minutes)
            return OTPVerifyResult.LOCKED
        return OTPVerifyResult.INVALID

    def peek_code_for_tests(self, phone_number: str) -> str | None:
        return self._debug_codes.get(phone_number)

    def reset(self) -> None:
        self._store.clear()
        self._debug_codes.clear()


otp_service = OTPService()
