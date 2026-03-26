import re


_PHONE_CLEANUP_PATTERN = re.compile(r'[\s().-]+')


def normalize_phone_number(value: str) -> str:
    normalized = _PHONE_CLEANUP_PATTERN.sub('', value or '').strip()
    if normalized.startswith('00'):
        normalized = f'+{normalized[2:]}'

    if normalized.startswith('+'):
        digits = normalized[1:]
        if not digits.isdigit():
            raise ValueError('Invalid phone number')
        normalized = f'+{digits}'
    elif not normalized.isdigit():
        raise ValueError('Invalid phone number')

    digits_only = normalized[1:] if normalized.startswith('+') else normalized
    if len(digits_only) < 8 or len(digits_only) > 15:
        raise ValueError('Invalid phone number')
    return normalized


def normalize_person_name(value: str) -> str:
    normalized = ' '.join((value or '').strip().split())
    if not normalized:
        raise ValueError('Invalid name')
    return normalized


def mask_phone_number(value: str) -> str:
    trimmed = value.strip()
    if len(trimmed) <= 4:
        return trimmed
    return f'***{trimmed[-4:]}'
