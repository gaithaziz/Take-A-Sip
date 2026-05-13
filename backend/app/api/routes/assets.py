from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.services.storage import get_storage_service

router = APIRouter(prefix='/assets', tags=['assets'])


@router.get('/{object_key:path}')
async def get_asset(object_key: str) -> Response:
    normalized_key = object_key.strip('/')
    if not normalized_key or '..' in normalized_key.split('/'):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset not found')

    try:
        content, content_type = await get_storage_service().get_object(normalized_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset not found') from exc
    except ClientError as exc:
        error_code = exc.response.get('Error', {}).get('Code')
        if error_code in {'NoSuchKey', '404', 'NotFound'}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset not found') from exc
        raise

    return Response(
        content=content,
        media_type=content_type or 'application/octet-stream',
        headers={'Cache-Control': 'public, max-age=31536000, immutable'},
    )
