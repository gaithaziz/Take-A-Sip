from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
    app.include_router(api_router, prefix=settings.api_prefix)
    uploads_dir = Path(settings.upload_dir)
    if not uploads_dir.is_absolute():
        uploads_dir = Path.cwd() / uploads_dir
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount('/uploads', StaticFiles(directory=str(uploads_dir)), name='uploads')

    @app.get('/health', tags=['health'])
    async def health() -> dict[str, str]:
        return {'status': 'ok'}

    return app


app = create_app()
