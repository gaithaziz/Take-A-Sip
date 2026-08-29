import json
from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Take A Sip API'
    api_prefix: str = ''
    debug: bool = False
    environment: str = 'development'
    log_level: str = 'INFO'
    sql_echo: bool = False
    public_api_base_url: str | None = None
    cors_allow_origins: list[str] = []
    cors_allow_origin_regex: str | None = None
    trusted_hosts: list[str] = []

    database_url: str = Field(
        default='postgresql+asyncpg://postgres:postgres@localhost:5432/take_a_sip'
    )
    migration_database_url: str | None = None
    database_pool_size: int = 5
    database_max_overflow: int = 5
    database_pool_timeout_seconds: int = 30
    database_pool_recycle_seconds: int = 1800
    database_use_null_pool: bool = False
    ready_check_db: bool = True
    public_cache_ttl_seconds: int = 60
    store_timezone: str = 'Asia/Amman'
    rate_limit_enabled: bool = True
    rate_limit_global_per_minute: int = 600
    rate_limit_send_otp_per_minute: int = 5
    rate_limit_verify_otp_per_minute: int = 10
    rate_limit_order_create_per_minute: int = 20
    rate_limit_upload_per_minute: int = 10
    rate_limit_admin_mutation_per_minute: int = 120

    jwt_secret_key: str = 'change-me'
    offer_identity_secret: str | None = None
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 60 * 12
    refresh_token_expire_days: int = 90

    otp_ttl_minutes: int = 5
    otp_resend_cooldown_seconds: int = 45
    otp_max_verify_attempts: int = 5
    otp_lock_minutes: int = 15
    otp_test_code: str = ''
    otp_provider: str = 'mock'
    otp_bypass_enabled: bool = False
    otp_bypass_code: str = ''
    otp_bypass_accounts: dict[str, str] = Field(default_factory=dict)
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    kiosk_login_secret: str | None = None
    kiosk_frontdesk_phone_number: str | None = None
    mersal_api_url: str | None = None
    mersal_api_key: str | None = None
    mersal_sender_id: str | None = None
    mersal_auth_header: str = 'X-API-Key'
    mersal_auth_scheme: str = ''
    mersal_phone_field: str = 'PhoneNumber'
    mersal_message_field: str = 'Message'
    mersal_sender_field: str = 'Sender'
    mersal_extra_payload_json: str | None = None
    push_enabled: bool = False
    push_android_provider: str = 'fcm'
    push_ios_provider: str = 'apns'
    fcm_project_id: str | None = None
    fcm_service_account_json: str | None = None
    apns_key_id: str | None = None
    apns_team_id: str | None = None
    apns_bundle_id: str | None = None
    apns_private_key: str | None = None
    apns_private_key_path: str | None = None
    apns_use_sandbox: bool = True
    storage_backend: str = 'local'
    storage_public_base_url: str | None = None
    upload_dir: str = 'uploads'
    max_upload_size_mb: int = 10
    s3_endpoint_url: str | None = None
    s3_region: str = 'auto'
    s3_bucket_name: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_key_prefix: str = ''
    s3_addressing_style: str = 'path'
    store_latitude: float | None = None
    store_longitude: float | None = None

    @staticmethod
    def _normalize_database_url(value):
        if not value:
            return value
        normalized = str(value).strip()
        if normalized.startswith('postgres://'):
            normalized = f'postgresql+asyncpg://{normalized[len("postgres://"):]}'
        if normalized.startswith('postgresql://'):
            normalized = normalized.replace('postgresql://', 'postgresql+asyncpg://', 1)
        if normalized.startswith('postgresql+asyncpg://'):
            parts = urlsplit(normalized)
            query_pairs = []
            for key, query_value in parse_qsl(parts.query, keep_blank_values=True):
                if key == 'sslmode':
                    if query_value == 'require':
                        query_pairs.append(('ssl', 'require'))
                    continue
                if key == 'channel_binding':
                    continue
                query_pairs.append((key, query_value))
            normalized = urlunsplit(
                (parts.scheme, parts.netloc, parts.path, urlencode(query_pairs), parts.fragment)
            )
        return normalized

    @staticmethod
    def _parse_string_list(value) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith('['):
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            return [item.strip() for item in raw.split(',') if item.strip()]
        return []

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

    @field_validator('push_enabled', 'apns_use_sandbox', 'otp_bypass_enabled', mode='before')
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

    @field_validator('database_use_null_pool', 'ready_check_db', 'rate_limit_enabled', mode='before')
    @classmethod
    def coerce_runtime_bool_flags(cls, value):
        return cls.coerce_bool_flags(value)

    @field_validator('log_level', mode='before')
    @classmethod
    def normalize_log_level(cls, value):
        if not value:
            return 'INFO'
        normalized = str(value).strip().upper()
        allowed = {'CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'}
        return normalized if normalized in allowed else 'INFO'

    @field_validator('environment', mode='before')
    @classmethod
    def normalize_environment(cls, value):
        return str(value or 'development').strip().lower()

    @field_validator('database_url', 'migration_database_url', mode='before')
    @classmethod
    def normalize_database_url(cls, value):
        return cls._normalize_database_url(value)

    @field_validator('cors_allow_origins', 'trusted_hosts', mode='before')
    @classmethod
    def parse_string_lists(cls, value):
        return cls._parse_string_list(value)

    @field_validator('otp_bypass_accounts', mode='before')
    @classmethod
    def parse_otp_bypass_accounts(cls, value):
        if value is None:
            return {}
        if isinstance(value, dict):
            return {str(phone).strip(): str(role).strip().upper() for phone, role in value.items() if str(phone).strip()}
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return {}
            if raw.startswith('{'):
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, dict):
                    return {
                        str(phone).strip(): str(role).strip().upper()
                        for phone, role in parsed.items()
                        if str(phone).strip()
                    }
            accounts = {}
            for item in raw.split(','):
                if ':' not in item:
                    continue
                phone, role = item.split(':', 1)
                phone = phone.strip()
                role = role.strip().upper()
                if phone:
                    accounts[phone] = role
            return accounts
        return {}

    @field_validator('storage_backend', mode='before')
    @classmethod
    def normalize_storage_backend(cls, value):
        return str(value or 'local').strip().lower()

    @field_validator('s3_key_prefix', mode='before')
    @classmethod
    def normalize_s3_key_prefix(cls, value):
        return str(value or '').strip().strip('/')

    @field_validator('s3_addressing_style', mode='before')
    @classmethod
    def normalize_s3_addressing_style(cls, value):
        normalized = str(value or 'path').strip().lower()
        return normalized if normalized in {'path', 'virtual'} else 'path'

    @model_validator(mode='after')
    def validate_storage_settings(self):
        if self.storage_backend not in {'local', 's3'}:
            raise ValueError('storage_backend must be "local" or "s3"')
        if self.storage_backend == 's3':
            required = {
                's3_endpoint_url': self.s3_endpoint_url,
                's3_bucket_name': self.s3_bucket_name,
                's3_access_key_id': self.s3_access_key_id,
                's3_secret_access_key': self.s3_secret_access_key,
            }
            missing = [name for name, value in required.items() if not value]
            if missing:
                raise ValueError(f'missing storage settings: {", ".join(missing)}')
        return self

    @model_validator(mode='after')
    def validate_push_settings(self):
        if self.push_android_provider != 'fcm':
            raise ValueError('push_android_provider must be "fcm"')
        if self.push_ios_provider != 'apns':
            raise ValueError('push_ios_provider must be "apns"')
        if not self.push_enabled:
            return self

        missing = []
        if not self.fcm_service_account_json:
            missing.append('fcm_service_account_json')
        if not self.apns_key_id:
            missing.append('apns_key_id')
        if not self.apns_team_id:
            missing.append('apns_team_id')
        if not self.apns_bundle_id:
            missing.append('apns_bundle_id')
        if not (self.apns_private_key or self.apns_private_key_path):
            missing.append('apns_private_key or apns_private_key_path')
        if missing:
            raise ValueError(f'missing push settings: {", ".join(missing)}')
        return self

    @property
    def effective_migration_database_url(self) -> str:
        return self.migration_database_url or self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
