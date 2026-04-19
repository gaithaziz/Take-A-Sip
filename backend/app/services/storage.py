from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import boto3
from botocore.config import Config
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}


def _normalized_extension(filename: str | None) -> str:
    extension = Path(filename or '').suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return '.jpg'
    return extension


def _join_url(base: str, suffix: str) -> str:
    return f'{base.rstrip("/")}/{suffix.lstrip("/")}'


@dataclass(frozen=True)
class StoredObject:
    key: str
    url: str


class StorageService:
    async def store_menu_image(
        self,
        *,
        content: bytes,
        filename: str | None,
        content_type: str | None,
        request_base_url: str,
    ) -> StoredObject:
        raise NotImplementedError


class LocalStorageService(StorageService):
    def __init__(self, upload_dir: str, public_base_url: str | None = None) -> None:
        uploads_dir = Path(upload_dir)
        if not uploads_dir.is_absolute():
            uploads_dir = Path.cwd() / uploads_dir
        self.uploads_dir = uploads_dir
        self.public_base_url = public_base_url
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    async def store_menu_image(
        self,
        *,
        content: bytes,
        filename: str | None,
        content_type: str | None,
        request_base_url: str,
    ) -> StoredObject:
        extension = _normalized_extension(filename)
        object_name = f'{uuid4().hex}{extension}'
        file_path = self.uploads_dir / object_name
        await run_in_threadpool(file_path.write_bytes, content)
        base_url = self.public_base_url or request_base_url
        return StoredObject(
            key=object_name,
            url=_join_url(base_url, f'uploads/{quote(object_name)}'),
        )


class S3CompatibleStorageService(StorageService):
    def __init__(
        self,
        *,
        endpoint_url: str,
        region: str,
        bucket_name: str,
        access_key_id: str,
        secret_access_key: str,
        key_prefix: str,
        addressing_style: str,
        public_base_url: str | None,
    ) -> None:
        self.bucket_name = bucket_name
        self.key_prefix = key_prefix
        self.public_base_url = public_base_url
        session = boto3.session.Session()
        self.client = session.client(
            's3',
            endpoint_url=endpoint_url,
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version='s3v4', s3={'addressing_style': addressing_style}),
        )
        self.endpoint_url = endpoint_url.rstrip('/')

    def _object_key(self, filename: str | None) -> str:
        extension = _normalized_extension(filename)
        object_name = f'{uuid4().hex}{extension}'
        if not self.key_prefix:
            return object_name
        return f'{self.key_prefix}/{object_name}'

    def _public_url(self, key: str) -> str:
        if self.public_base_url:
            return _join_url(self.public_base_url, quote(key, safe='/'))
        return _join_url(f'{self.endpoint_url}/{self.bucket_name}', quote(key, safe='/'))

    async def store_menu_image(
        self,
        *,
        content: bytes,
        filename: str | None,
        content_type: str | None,
        request_base_url: str,
    ) -> StoredObject:
        _ = request_base_url
        object_key = self._object_key(filename)
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        await run_in_threadpool(
            self.client.put_object,
            Bucket=self.bucket_name,
            Key=object_key,
            Body=content,
            **extra_args,
        )
        return StoredObject(key=object_key, url=self._public_url(object_key))


@lru_cache
def get_storage_service() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == 's3':
        return S3CompatibleStorageService(
            endpoint_url=settings.s3_endpoint_url or '',
            region=settings.s3_region,
            bucket_name=settings.s3_bucket_name or '',
            access_key_id=settings.s3_access_key_id or '',
            secret_access_key=settings.s3_secret_access_key or '',
            key_prefix=settings.s3_key_prefix,
            addressing_style=settings.s3_addressing_style,
            public_base_url=settings.storage_public_base_url,
        )
    return LocalStorageService(settings.upload_dir, public_base_url=settings.public_api_base_url)
