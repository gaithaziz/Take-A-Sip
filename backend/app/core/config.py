from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Take A Sip API'
    api_prefix: str = ''
    debug: bool = False

    database_url: str = Field(
        default='postgresql+asyncpg://postgres:postgres@localhost:5432/take_a_sip'
    )

    jwt_secret_key: str = 'change-me'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 60 * 24 * 7

    otp_ttl_minutes: int = 5
    otp_test_code: str = '123456'
    otp_provider: str = 'mock'
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None

    @field_validator('debug', mode='before')
    @classmethod
    def coerce_debug(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {'1', 'true', 'yes', 'on', 'debug'}:
                return True
            if normalized in {'0', 'false', 'no', 'off', 'release', ''}:
                return False
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()
