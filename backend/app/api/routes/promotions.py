from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import ACTIVE_PROMOTIONS_CACHE_KEY, public_response_cache
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.promotion import ActivePromotionsResponse, PromotionEvaluationRequest, PromotionEvaluationResponse, PromotionRead
from app.services.promotion_service import evaluate_promotions_for_user, get_active_promotions, serialize_promotion, _load_target_lookup

router = APIRouter(prefix='/promotions', tags=['promotions'])


@router.get('/active', response_model=ActivePromotionsResponse)
async def active_promotions(db: AsyncSession = Depends(get_db)) -> ActivePromotionsResponse:
    cached = public_response_cache.get(ACTIVE_PROMOTIONS_CACHE_KEY)
    if isinstance(cached, ActivePromotionsResponse):
        return cached

    promotions = await get_active_promotions(db)
    target_lookup = await _load_target_lookup(db, promotions)
    response = ActivePromotionsResponse(
        promotions=[PromotionRead.model_validate(serialize_promotion(p, target_lookup)) for p in promotions]
    )
    public_response_cache.set(ACTIVE_PROMOTIONS_CACHE_KEY, response, get_settings().public_cache_ttl_seconds)
    return response


@router.post('/evaluate', response_model=PromotionEvaluationResponse)
async def evaluate_promotions_endpoint(
    payload: PromotionEvaluationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromotionEvaluationResponse:
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only clients can evaluate promotions')
    return await evaluate_promotions_for_user(db, current_user, payload.items)
