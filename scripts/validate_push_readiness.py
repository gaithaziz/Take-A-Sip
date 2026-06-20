#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path


def env_value(name: str) -> str:
    return os.getenv(name, '').strip()


def has_value(name: str) -> bool:
    return bool(env_value(name))


def main() -> int:
    failures: list[str] = []

    if env_value('PUSH_ENABLED').lower() not in {'1', 'true', 'yes', 'on'}:
        failures.append('PUSH_ENABLED must be true to deliver push notifications.')

    if env_value('PUSH_ANDROID_PROVIDER') not in {'', 'fcm'}:
        failures.append('PUSH_ANDROID_PROVIDER must be fcm.')
    if env_value('PUSH_IOS_PROVIDER') not in {'', 'apns'}:
        failures.append('PUSH_IOS_PROVIDER must be apns.')

    if not has_value('FCM_SERVICE_ACCOUNT_JSON'):
        failures.append('FCM_SERVICE_ACCOUNT_JSON is required for Android FCM delivery.')

    for name in ('APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_BUNDLE_ID'):
        if not has_value(name):
            failures.append(f'{name} is required for iOS APNs delivery.')

    apns_private_key_path = env_value('APNS_PRIVATE_KEY_PATH')
    if not has_value('APNS_PRIVATE_KEY') and not apns_private_key_path:
        failures.append('APNS_PRIVATE_KEY or APNS_PRIVATE_KEY_PATH is required for iOS APNs delivery.')
    if (
        apns_private_key_path.startswith('-----BEGIN')
        or '\\n' in apns_private_key_path
        or '\n' in apns_private_key_path
    ):
        failures.append(
            'APNS_PRIVATE_KEY_PATH looks like key contents. Use APNS_PRIVATE_KEY for Secret Manager env injection.'
        )
    if apns_private_key_path and not Path(apns_private_key_path).is_file():
        failures.append(f'APNS_PRIVATE_KEY_PATH does not point to a readable file: {apns_private_key_path}')
    if env_value('ENVIRONMENT').lower() == 'production' and env_value('APNS_USE_SANDBOX').lower() in {
        '',
        '1',
        'true',
        'yes',
        'on',
    }:
        failures.append('APNS_USE_SANDBOX must be false for production iOS builds.')

    if failures:
        print('Push readiness failed:', file=sys.stderr)
        for failure in failures:
            print(f'- {failure}', file=sys.stderr)
        return 1

    print('Push readiness checks passed for Android FCM and iOS APNs.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
