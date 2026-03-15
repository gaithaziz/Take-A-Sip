import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, log_structured, request_log_context
from app.core.metrics import metrics


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)
    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
    app.include_router(api_router, prefix=settings.api_prefix)
    register_exception_handlers(app)

    @app.middleware('http')
    async def request_context_middleware(request, call_next):
        started_at = time.perf_counter()
        request.state.request_id = str(uuid4())
        try:
            response = await call_next(request)
        except Exception:
            metrics.record_request(
                method=request.method,
                path=request.url.path,
                status_code=500,
                elapsed_ms=round((time.perf_counter() - started_at) * 1000, 2),
            )
            log_structured(
                logger,
                logging.ERROR,
                'http.request_failed',
                request_log_context(request, started_at, 500),
            )
            raise
        response.headers['X-Request-ID'] = request.state.request_id
        context = request_log_context(request, started_at, response.status_code)
        metrics.record_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            elapsed_ms=context['elapsed_ms'],
        )
        log_structured(
            logger,
            logging.INFO,
            'http.request',
            context,
        )
        return response

    uploads_dir = Path(settings.upload_dir)
    if not uploads_dir.is_absolute():
        uploads_dir = Path.cwd() / uploads_dir
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount('/uploads', StaticFiles(directory=str(uploads_dir)), name='uploads')

    @app.get('/health', tags=['health'])
    async def health() -> dict[str, str]:
        return {'status': 'ok'}

    @app.get('/metrics', tags=['health'])
    async def get_metrics() -> dict:
        return metrics.snapshot()

    return app


app = create_app()
