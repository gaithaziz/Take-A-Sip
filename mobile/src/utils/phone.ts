const PHONE_CLEANUP_PATTERN = /[\s().-]+/g;

export const normalizePhoneNumber = (value: string) => {
  let normalized = value.replace(PHONE_CLEANUP_PATTERN, '').trim();
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith('+')) {
    const digits = normalized.slice(1);
    if (!/^\d+$/.test(digits)) {
      return null;
    }
    normalized = `+${digits}`;
  } else if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const digitsOnly = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null;
  }
  return normalized;
};
