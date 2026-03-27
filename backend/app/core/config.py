from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Take A Sip API'
    api_prefix: str = ''
    debug: bool = False
    environment: str = 'development'
    log_level: str = 'INFO'
    sql_echo: bool = False

    database_url: str = Field(
        default='postgresql+asyncpg://postgres:postgres@localhost:5432/take_a_sip'
    )

    jwt_secret_key: str = 'change-me'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 60 * 24 * 7

    otp_ttl_minutes: int = 5
    otp_resend_cooldown_seconds: int = 45
    otp_max_verify_attempts: int = 5
    otp_lock_minutes: int = 15
    otp_test_code: str = ''
    otp_provider: str = 'mock'
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    push_enabled: bool = False
    push_android_provider: str = 'fcm'
    push_ios_provider: str = 'apns'
    fcm_project_id: str | None = None
    fcm_service_account_json: str | None = None
    apns_key_id: str | None = None
    apns_team_id: str | None = None
    apns_bundle_id: str | None = None
    apns_private_key_path: str | None = None
    apns_use_sandbox: bool = True
    upload_dir: str = 'uploads'
    max_upload_size_mb: int = 10
    store_latitude: float | None = None
    store_longitude: float | None = None

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

    @field_validator('sql_echo', mode='before')
    @classmethod
    def coerce_sql_echo(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {'1', 'true', 'yes', 'on'}:
                return True
            if normalized in {'0', 'false', 'no', 'off', ''}:
                return False
        return False

    @field_validator('push_enabled', 'apns_use_sandbox', mode='before')
    @classmethod
    def coerce_bool_flags(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {'1', 'true', 'yes', 'on'}:
                return True
            if normalized in {'0', 'false', 'no', 'off', ''}:
                return False
        return False

    @field_validator('log_level', mode='before')
    @classmethod
    def normalize_log_level(cls, value):
        if not value:
            return 'INFO'
        normalized = str(value).strip().upper()
        allowed = {'CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'}
        return normalized if normalized in allowed else 'INFO'


@lru_cache
def get_settings() -> Settings:
    return Settings()
