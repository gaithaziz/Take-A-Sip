from dataclasses import dataclass
from time import monotonic
from typing import Generic, TypeVar

T = TypeVar('T')


@dataclass
class CacheEntry(Generic[T]):
    value: T
    expires_at: float


class TTLCache:
    def __init__(self) -> None:
        self._entries: dict[str, CacheEntry[object]] = {}

    def get(self, key: str) -> object | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if entry.expires_at <= monotonic():
            self._entries.pop(key, None)
            return None
        return entry.value

    def set(self, key: str, value: object, ttl_seconds: int) -> None:
        if ttl_seconds <= 0:
            self._entries.pop(key, None)
            return
        self._entries[key] = CacheEntry(value=value, expires_at=monotonic() + ttl_seconds)

    def delete(self, key: str) -> None:
        self._entries.pop(key, None)

    def clear(self) -> None:
        self._entries.clear()


PUBLIC_MENU_CACHE_KEY = 'public_menu'
ACTIVE_PROMOTIONS_CACHE_KEY = 'active_promotions'

public_response_cache = TTLCache()
