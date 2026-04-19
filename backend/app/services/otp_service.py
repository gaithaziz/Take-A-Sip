from datetime import datetime, timedelta, timezone
from enum import Enum
from hashlib import sha256
from hmac import compare_digest
from secrets import randbelow

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.otp_challenge import OTPChallenge


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


class OTPService:
    def __init__(self) -> None:
        self._debug_codes: dict[str, str] = {}
        self._settings = get_settings()

    @staticmethod
    def _hash_code(code: str) -> str:
        return sha256(code.encode('utf-8')).hexdigest()

    def _clear_debug_code(self, phone_number: str) -> None:
        self._debug_codes.pop(phone_number, None)

    def _should_track_debug_codes(self) -> bool:
        return self._settings.environment not in {'production', 'prod'}

    async def clear_challenge(self, db: AsyncSession, phone_number: str) -> None:
        challenge = await db.get(OTPChallenge, phone_number)
        if challenge is not None:
            await db.delete(challenge)
            await db.commit()
        self._clear_debug_code(phone_number)

    async def generate_and_store(self, db: AsyncSession, phone_number: str) -> str:
        now = datetime.now(timezone.utc)
        challenge = await db.get(OTPChallenge, phone_number, with_for_update=True)
        if challenge is not None:
            if challenge.locked_until is not None and now < challenge.locked_until:
                await db.rollback()
                retry_after = max(int((challenge.locked_until - now).total_seconds()), 1)
                raise OTPRateLimitError(retry_after)
            if now < challenge.resend_available_at:
                await db.rollback()
                retry_after = max(int((challenge.resend_available_at - now).total_seconds()), 1)
                raise OTPRateLimitError(retry_after)

        code = self._settings.otp_test_code
        if not code:
            code = f'{randbelow(900000) + 100000}'
        if challenge is None:
            challenge = OTPChallenge(
                phone_number=phone_number,
                code_hash=self._hash_code(code),
                expires_at=now + timedelta(minutes=self._settings.otp_ttl_minutes),
                resend_available_at=now + timedelta(seconds=self._settings.otp_resend_cooldown_seconds),
                attempts_remaining=self._settings.otp_max_verify_attempts,
                locked_until=None,
            )
            db.add(challenge)
        else:
            challenge.code_hash = self._hash_code(code)
            challenge.expires_at = now + timedelta(minutes=self._settings.otp_ttl_minutes)
            challenge.resend_available_at = now + timedelta(seconds=self._settings.otp_resend_cooldown_seconds)
            challenge.attempts_remaining = self._settings.otp_max_verify_attempts
            challenge.locked_until = None

        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise OTPRateLimitError(1) from exc
        if self._should_track_debug_codes():
            self._debug_codes[phone_number] = code
        else:
            self._clear_debug_code(phone_number)
        return code

    async def verify(self, db: AsyncSession, phone_number: str, otp_code: str) -> OTPVerifyResult:
        challenge = await db.get(OTPChallenge, phone_number, with_for_update=True)
        if challenge is None:
            return OTPVerifyResult.NOT_FOUND

        now = datetime.now(timezone.utc)
        if challenge.locked_until is not None and now < challenge.locked_until:
            await db.rollback()
            return OTPVerifyResult.LOCKED
        if now > challenge.expires_at:
            await db.delete(challenge)
            await db.commit()
            self._clear_debug_code(phone_number)
            return OTPVerifyResult.EXPIRED
        if compare_digest(challenge.code_hash, self._hash_code(otp_code)):
            await db.delete(challenge)
            await db.commit()
            self._clear_debug_code(phone_number)
            return OTPVerifyResult.SUCCESS

        challenge.attempts_remaining -= 1
        if challenge.attempts_remaining <= 0:
            challenge.locked_until = now + timedelta(minutes=self._settings.otp_lock_minutes)
            await db.commit()
            return OTPVerifyResult.LOCKED
        await db.commit()
        return OTPVerifyResult.INVALID

    def peek_code_for_tests(self, phone_number: str) -> str | None:
        return self._debug_codes.get(phone_number)

    def reset(self) -> None:
        self._debug_codes.clear()


otp_service = OTPService()
