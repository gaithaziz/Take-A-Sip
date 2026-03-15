import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import Request


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        if hasattr(record, 'event'):
            payload['event'] = getattr(record, 'event')
        if hasattr(record, 'request_id'):
            payload['request_id'] = getattr(record, 'request_id')
        if hasattr(record, 'context') and isinstance(getattr(record, 'context'), dict):
            payload.update(getattr(record, 'context'))
        return json.dumps(payload, ensure_ascii=True)


def configure_logging(level_name: str = 'INFO') -> None:
    root = logging.getLogger()
    if root.handlers:
        return

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level_name.upper(), logging.INFO))


def log_structured(logger: logging.Logger, level: int, event: str, context: dict[str, Any] | None = None) -> None:
    logger.log(level, event, extra={'event': event, 'context': context or {}})


def request_log_context(request: Request, started_at: float, status_code: int) -> dict[str, Any]:
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    return {
        'method': request.method,
        'path': request.url.path,
        'status_code': status_code,
        'elapsed_ms': elapsed_ms,
        'request_id': getattr(request.state, 'request_id', None),
    }
