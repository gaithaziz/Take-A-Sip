import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import api_router
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, log_structured, request_log_context
from app.core.metrics import metrics
from app.services.storage import LocalStorageService, get_storage_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_storage_service()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)
    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
    app.include_router(api_router, prefix=settings.api_prefix)
    register_exception_handlers(app)

    if settings.cors_allow_origins or settings.cors_allow_origin_regex:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_origin_regex=settings.cors_allow_origin_regex,
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )

    if settings.trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

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

    storage_service = get_storage_service()
    if isinstance(storage_service, LocalStorageService):
        uploads_dir = Path(settings.upload_dir)
        if not uploads_dir.is_absolute():
            uploads_dir = Path.cwd() / uploads_dir
        uploads_dir.mkdir(parents=True, exist_ok=True)
        app.mount('/uploads', StaticFiles(directory=str(uploads_dir)), name='uploads')

    @app.get('/health', tags=['health'])
    async def health() -> dict[str, str]:
        return {'status': 'ok'}

    @app.get('/ready', tags=['health'])
    async def ready(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
        if settings.ready_check_db:
            try:
                await db.execute(text('SELECT 1'))
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail='Database not ready',
                ) from exc
        return {'status': 'ok'}

    @app.get('/metrics', tags=['health'])
    async def get_metrics() -> dict:
        return metrics.snapshot()

    return app


app = create_app()
