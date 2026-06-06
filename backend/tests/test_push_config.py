import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.services import notification_service


def test_push_enabled_requires_fcm_and_apns_credentials():
    with pytest.raises(ValidationError) as exc_info:
        Settings(push_enabled=True)

    message = str(exc_info.value)
    assert 'fcm_service_account_json' in message
    assert 'apns_key_id' in message
    assert 'apns_team_id' in message
    assert 'apns_bundle_id' in message
    assert 'apns_private_key or apns_private_key_path' in message


def test_push_enabled_accepts_complete_credentials():
    settings = Settings(
        push_enabled=True,
        fcm_service_account_json='{"project_id":"take-a-sip","client_email":"push@example.com","private_key":"key"}',
        apns_key_id='KEY1234567',
        apns_team_id='TEAM123456',
        apns_bundle_id='com.takeasip.mobile',
        apns_private_key='-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
    )

    assert settings.push_enabled is True


def test_apns_private_key_can_load_from_env_value(monkeypatch):
    monkeypatch.setattr(
        notification_service.settings,
        'apns_private_key',
        '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
    )
    monkeypatch.setattr(notification_service.settings, 'apns_private_key_path', None)

    assert notification_service._load_apns_private_key() == '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'


def test_apns_private_key_can_load_from_file_path(tmp_path, monkeypatch):
    key_file = tmp_path / 'AuthKey_TEST.p8'
    key_file.write_text('private-key-from-file', encoding='utf-8')
    monkeypatch.setattr(notification_service.settings, 'apns_private_key', None)
    monkeypatch.setattr(notification_service.settings, 'apns_private_key_path', str(key_file))

    assert notification_service._load_apns_private_key() == 'private-key-from-file'


def test_fcm_project_id_falls_back_to_service_account(monkeypatch):
    monkeypatch.setattr(notification_service.settings, 'fcm_project_id', None)

    assert notification_service._resolve_fcm_project_id({'project_id': 'take-a-sip'}) == 'take-a-sip'
