import json
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import log_structured
from app.models.order import Order, OrderStatus, OrderType
from app.models.promotion import Promotion
from app.models.user import User, UserRole
from app.models.user_push_token import UserPushToken
from app.schemas.notification import PushTokenRegisterRequest

logger = logging.getLogger(__name__)
settings = get_settings()

_FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
_GOOGLE_TOKEN_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
_SERVICE_RLS_USER_ID = '00000000-0000-0000-0000-000000000000'
_sender_override = None


@dataclass
class NotificationSendAttempt:
    push_token_id: UUID
    push_token: str
    success: bool
    deactivate: bool = False
    provider: str | None = None
    error_code: str | None = None


def set_notification_sender_override(sender) -> None:
    global _sender_override
    _sender_override = sender


async def _current_rls_setting(db: AsyncSession, setting_name: str) -> str:
    result = await db.execute(text('select current_setting(:setting_name, true)'), {'setting_name': setting_name})
    return result.scalar_one() or ''


@asynccontextmanager
async def _privileged_notification_context(db: AsyncSession):
    previous_user_id = await _current_rls_setting(db, 'app.current_user_id')
    previous_user_role = await _current_rls_setting(db, 'app.current_user_role')
    await db.execute(
        text(
            "select set_config('app.current_user_id', :user_id, false), "
            "set_config('app.current_user_role', 'ADMIN', false)"
        ),
        {'user_id': _SERVICE_RLS_USER_ID},
    )
    try:
        yield
    finally:
        await db.execute(
            text(
                "select set_config('app.current_user_id', :user_id, false), "
                "set_config('app.current_user_role', :user_role, false)"
            ),
            {'user_id': previous_user_id, 'user_role': previous_user_role},
        )


async def register_push_token(db: AsyncSession, user: User, payload: PushTokenRegisterRequest) -> UserPushToken:
    now = datetime.now(timezone.utc)
    values = {
        'user_id': user.id,
        'platform': payload.platform,
        'push_provider': payload.push_provider,
        'push_token': payload.push_token,
        'device_id': payload.device_id,
        'language': payload.language,
        'is_active': True,
        'last_seen_at': now,
    }
    statement = (
        pg_insert(UserPushToken)
        .values(**values)
        .on_conflict_do_update(
            index_elements=[UserPushToken.push_token],
            set_=values,
        )
        .returning(UserPushToken.id)
    )

    async with _privileged_notification_context(db):
        result = await db.execute(statement)
        token_id = result.scalar_one()
        await db.commit()
    token = await db.get(UserPushToken, token_id)
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Push token not found')
    return token


async def deactivate_push_token(db: AsyncSession, user: User, push_token: str) -> UserPushToken:
    result = await db.execute(
        select(UserPushToken).where(UserPushToken.push_token == push_token, UserPushToken.user_id == user.id)
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Push token not found')

    token.is_active = False
    token.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(token)
    return token


def _notification_spec(notification_type: str, order: Order, language: str) -> dict[str, str]:
    is_arabic = language == 'ar'
    specs = {
        'client_order_accepted': {
            'role_target': UserRole.CLIENT.value,
            'title': '\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u0637\u0644\u0628' if is_arabic else 'Order accepted',
            'body': (
                f'\u062a\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number}.'
                if is_arabic
                else f'Order #{order.order_number} has been accepted.'
            ),
            'screen': 'ClientOrderDetails',
        },
        'client_driver_assigned': {
            'role_target': UserRole.CLIENT.value,
            'title': '\u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u0633\u0627\u0626\u0642' if is_arabic else 'Driver assigned',
            'body': (
                f'\u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u0633\u0627\u0626\u0642 \u0644\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number}.'
                if is_arabic
                else f'A driver has been assigned to order #{order.order_number}.'
            ),
            'screen': 'ClientOrderDetails',
        },
        'client_out_for_delivery': {
            'role_target': UserRole.CLIENT.value,
            'title': '\u0627\u0644\u0637\u0644\u0628 \u0641\u064a \u0627\u0644\u0637\u0631\u064a\u0642' if is_arabic else 'Out for delivery',
            'body': (
                f'\u0627\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number} \u0641\u064a \u0627\u0644\u0637\u0631\u064a\u0642 \u0625\u0644\u064a\u0643.'
                if is_arabic
                else f'Order #{order.order_number} is on the way.'
            ),
            'screen': 'ClientOrderDetails',
        },
        'client_order_delivered': {
            'role_target': UserRole.CLIENT.value,
            'title': '\u062a\u0645 \u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0637\u0644\u0628' if is_arabic else 'Order delivered',
            'body': (
                f'\u062a\u0645 \u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number}.'
                if is_arabic
                else f'Order #{order.order_number} has been delivered.'
            ),
            'screen': 'ClientOrderDetails',
        },
        'client_order_completed': {
            'role_target': UserRole.CLIENT.value,
            'title': '\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u0637\u0644\u0628' if is_arabic else 'Order completed',
            'body': (
                f'\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number} \u0648\u0647\u0648 \u062c\u0627\u0647\u0632.'
                if is_arabic
                else f'Order #{order.order_number} is ready and completed.'
            ),
            'screen': 'ClientOrderDetails',
        },
        'admin_new_order': {
            'role_target': UserRole.ADMIN.value,
            'title': '\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628 \u062c\u062f\u064a\u062f' if is_arabic else 'New order received',
            'body': (
                f'\u0627\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number} \u064a\u062d\u062a\u0627\u062c \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629.'
                if is_arabic
                else f'Order #{order.order_number} needs attention.'
            ),
            'screen': 'AdminOrderDetails',
        },
        'admin_driver_assignment_needed': {
            'role_target': UserRole.ADMIN.value,
            'title': '\u0645\u0637\u0644\u0648\u0628 \u062a\u0639\u064a\u064a\u0646 \u0633\u0627\u0626\u0642' if is_arabic else 'Driver assignment needed',
            'body': (
                f'\u064a\u0631\u062c\u0649 \u062a\u0639\u064a\u064a\u0646 \u0633\u0627\u0626\u0642 \u0644\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number}.'
                if is_arabic
                else f'Assign a driver to order #{order.order_number}.'
            ),
            'screen': 'AdminOrderDetails',
        },
        'driver_order_assigned': {
            'role_target': UserRole.DRIVER.value,
            'title': '\u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u0637\u0644\u0628 \u062a\u0648\u0635\u064a\u0644 \u062c\u062f\u064a\u062f' if is_arabic else 'New delivery assigned',
            'body': (
                f'\u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0637\u0644\u0628 \u0631\u0642\u0645 {order.order_number} \u0644\u0643.'
                if is_arabic
                else f'Order #{order.order_number} has been assigned to you.'
            ),
            'screen': 'DriverOrderDetails',
        },
    }
    spec = specs.get(notification_type)
    if spec is None:
        raise ValueError(f'Unsupported notification type: {notification_type}')
    return spec


def _notification_payload(notification_type: str, order: Order, language: str) -> dict[str, str]:
    spec = _notification_spec(notification_type, order, language)
    return {
        'type': notification_type,
        'order_id': str(order.id),
        'role_target': spec['role_target'],
        'screen': spec['screen'],
        'title': spec['title'],
        'body': spec['body'],
    }


async def _resolve_admin_user_ids(db: AsyncSession) -> list[UUID]:
    async with _privileged_notification_context(db):
        result = await db.execute(
            select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True), User.is_banned.is_(False))
        )
    return [row[0] for row in result.all()]


async def _resolve_client_user_ids(db: AsyncSession) -> list[UUID]:
    async with _privileged_notification_context(db):
        result = await db.execute(
            select(User.id).where(User.role == UserRole.CLIENT, User.is_active.is_(True), User.is_banned.is_(False))
        )
    return [row[0] for row in result.all()]


async def send_order_notification_to_users(
    db: AsyncSession,
    *,
    notification_type: str,
    order: Order,
    user_ids: list[UUID],
) -> list[NotificationSendAttempt]:
    if not user_ids:
        return []

    return await _dispatch_payload_to_users(
        db,
        user_ids=user_ids,
        notification_type=notification_type,
        order=order,
    )


async def send_order_notification_to_admins(
    db: AsyncSession,
    *,
    notification_type: str,
    order: Order,
) -> list[NotificationSendAttempt]:
    admin_ids = await _resolve_admin_user_ids(db)
    return await send_order_notification_to_users(
        db,
        notification_type=notification_type,
        order=order,
        user_ids=admin_ids,
    )


def _promotion_notification_payload(promotion: Promotion, language: str) -> dict[str, str]:
    is_arabic = language == 'ar'
    title = '\u0639\u0631\u0636 \u062c\u062f\u064a\u062f' if is_arabic else 'New offer'
    promotion_title = promotion.title_ar if is_arabic else promotion.title_en
    body = (
        f'{promotion_title} \u0645\u062a\u0627\u062d \u0627\u0644\u0622\u0646. \u0627\u0641\u062a\u062d \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0644\u062a\u0641\u0627\u0635\u064a\u0644.'
        if is_arabic
        else f'{promotion_title} is available now. Open the app for details.'
    )
    return {
        'type': 'promotion_created',
        'promotion_id': str(promotion.id),
        'role_target': UserRole.CLIENT.value,
        'screen': 'Home',
        'title': title,
        'body': body,
    }


async def send_promotion_created_notification_to_clients(
    db: AsyncSession,
    *,
    promotion: Promotion,
) -> list[NotificationSendAttempt]:
    client_ids = await _resolve_client_user_ids(db)
    return await _dispatch_promotion_payload_to_users(db, user_ids=client_ids, promotion=promotion)


async def _dispatch_payload_to_users(
    db: AsyncSession,
    *,
    user_ids: list[UUID],
    notification_type: str,
    order: Order,
) -> list[NotificationSendAttempt]:
    if not settings.push_enabled:
        log_structured(
            logger,
            logging.INFO,
            'notifications.push_disabled',
            {'type': notification_type, 'recipient_count': len(user_ids)},
        )
        return []

    async with _privileged_notification_context(db):
        result = await db.execute(
            select(UserPushToken).where(UserPushToken.user_id.in_(user_ids), UserPushToken.is_active.is_(True))
        )
        tokens = list(result.scalars().all())
        if not tokens:
            log_structured(
                logger,
                logging.INFO,
                'notifications.no_tokens',
                {'type': notification_type, 'recipient_count': len(user_ids)},
            )
            return []

        attempts: list[NotificationSendAttempt] = []
        for token in tokens:
            payload = _notification_payload(notification_type, order, token.language)
            try:
                attempt = await _deliver_push_token(token, payload)
            except Exception as exc:
                log_structured(
                    logger,
                    logging.WARNING,
                    'notifications.send_failed',
                    {
                        'push_token_id': str(token.id),
                        'user_id': str(token.user_id),
                        'provider': token.push_provider,
                        'type': notification_type,
                        'error': str(exc),
                    },
                )
                attempts.append(
                    NotificationSendAttempt(
                        push_token_id=token.id,
                        push_token=token.push_token,
                        success=False,
                        deactivate=False,
                        provider=token.push_provider,
                        error_code='send_failed',
                    )
                )
                continue

            attempts.append(attempt)
            if attempt.deactivate:
                token.is_active = False
                token.last_seen_at = datetime.now(timezone.utc)

        if any(attempt.deactivate for attempt in attempts):
            await db.commit()

    log_structured(
        logger,
        logging.INFO,
        'notifications.dispatch_complete',
        {
            'type': notification_type,
            'recipient_count': len(user_ids),
            'token_count': len(attempts),
            'success_count': sum(1 for attempt in attempts if attempt.success),
            'deactivate_count': sum(1 for attempt in attempts if attempt.deactivate),
        },
    )
    return attempts


async def _dispatch_promotion_payload_to_users(
    db: AsyncSession,
    *,
    user_ids: list[UUID],
    promotion: Promotion,
) -> list[NotificationSendAttempt]:
    notification_type = 'promotion_created'
    if not user_ids:
        return []

    if not settings.push_enabled:
        log_structured(
            logger,
            logging.INFO,
            'notifications.push_disabled',
            {'type': notification_type, 'recipient_count': len(user_ids)},
        )
        return []

    async with _privileged_notification_context(db):
        result = await db.execute(
            select(UserPushToken).where(UserPushToken.user_id.in_(user_ids), UserPushToken.is_active.is_(True))
        )
        tokens = list(result.scalars().all())
        if not tokens:
            log_structured(
                logger,
                logging.INFO,
                'notifications.no_tokens',
                {'type': notification_type, 'recipient_count': len(user_ids)},
            )
            return []

        attempts: list[NotificationSendAttempt] = []
        for token in tokens:
            payload = _promotion_notification_payload(promotion, token.language)
            try:
                attempt = await _deliver_push_token(token, payload)
            except Exception as exc:
                log_structured(
                    logger,
                    logging.WARNING,
                    'notifications.send_failed',
                    {
                        'push_token_id': str(token.id),
                        'user_id': str(token.user_id),
                        'provider': token.push_provider,
                        'type': notification_type,
                        'error': str(exc),
                    },
                )
                attempts.append(
                    NotificationSendAttempt(
                        push_token_id=token.id,
                        push_token=token.push_token,
                        success=False,
                        deactivate=False,
                        provider=token.push_provider,
                        error_code='send_failed',
                    )
                )
                continue

            attempts.append(attempt)
            if attempt.deactivate:
                token.is_active = False
                token.last_seen_at = datetime.now(timezone.utc)

        if any(attempt.deactivate for attempt in attempts):
            await db.commit()

    log_structured(
        logger,
        logging.INFO,
        'notifications.dispatch_complete',
        {
            'type': notification_type,
            'recipient_count': len(user_ids),
            'token_count': len(attempts),
            'success_count': sum(1 for attempt in attempts if attempt.success),
            'deactivate_count': sum(1 for attempt in attempts if attempt.deactivate),
        },
    )
    return attempts


async def _deliver_push_token(token: UserPushToken, payload: dict[str, str]) -> NotificationSendAttempt:
    if _sender_override is not None:
        return await _sender_override(token, payload)
    if token.push_provider == 'fcm':
        return await _send_via_fcm(token, payload)
    if token.push_provider == 'apns':
        return await _send_via_apns(token, payload)
    return NotificationSendAttempt(
        push_token_id=token.id,
        push_token=token.push_token,
        success=False,
        deactivate=False,
        provider=token.push_provider,
        error_code='unsupported_provider',
    )


def _load_fcm_service_account() -> dict[str, Any]:
    raw_value = settings.fcm_service_account_json
    if not raw_value:
        raise RuntimeError('FCM credentials are not configured')
    text = raw_value.strip()
    if text.startswith('{'):
        return json.loads(text)
    return json.loads(Path(text).read_text(encoding='utf-8'))


async def _create_google_access_token() -> str:
    service_account = _load_fcm_service_account()
    now = int(time.time())
    assertion = jwt.encode(
        {
            'iss': service_account['client_email'],
            'scope': _FCM_SCOPE,
            'aud': service_account.get('token_uri', 'https://oauth2.googleapis.com/token'),
            'iat': now,
            'exp': now + 3600,
        },
        service_account['private_key'],
        algorithm='RS256',
    )
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            service_account.get('token_uri', 'https://oauth2.googleapis.com/token'),
            data={'grant_type': _GOOGLE_TOKEN_GRANT, 'assertion': assertion},
        )
    response.raise_for_status()
    return response.json()['access_token']


def _resolve_fcm_project_id(service_account: dict[str, Any]) -> str | None:
    return settings.fcm_project_id or service_account.get('project_id')


async def _send_via_fcm(token: UserPushToken, payload: dict[str, str]) -> NotificationSendAttempt:
    service_account = _load_fcm_service_account()
    project_id = _resolve_fcm_project_id(service_account)
    if not project_id:
        raise RuntimeError('FCM project id is not configured')

    access_token = await _create_google_access_token()
    message = {
        'message': {
            'token': token.push_token,
            'notification': {'title': payload['title'], 'body': payload['body']},
            'data': {key: value for key, value in payload.items() if key not in {'title', 'body'}},
        }
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send',
            headers={'Authorization': f'Bearer {access_token}'},
            json=message,
        )

    if response.status_code < 400:
        return NotificationSendAttempt(token.id, token.push_token, success=True, provider='fcm')

    body = response.text
    deactivate = 'UNREGISTERED' in body or 'registration-token-not-registered' in body
    return NotificationSendAttempt(
        token.id,
        token.push_token,
        success=False,
        deactivate=deactivate,
        provider='fcm',
        error_code=f'fcm_{response.status_code}',
    )


def _load_apns_private_key() -> str:
    if settings.apns_private_key:
        return settings.apns_private_key.replace('\\n', '\n')
    if not settings.apns_private_key_path:
        raise RuntimeError('APNs private key path is not configured')
    return Path(settings.apns_private_key_path).read_text(encoding='utf-8')


def _create_apns_jwt() -> str:
    if not settings.apns_key_id or not settings.apns_team_id:
        raise RuntimeError('APNs key configuration is incomplete')
    return jwt.encode(
        {'iss': settings.apns_team_id, 'iat': int(time.time())},
        _load_apns_private_key(),
        algorithm='ES256',
        headers={'alg': 'ES256', 'kid': settings.apns_key_id},
    )


async def _send_via_apns(token: UserPushToken, payload: dict[str, str]) -> NotificationSendAttempt:
    if not settings.apns_bundle_id:
        raise RuntimeError('APNs bundle id is not configured')

    host = 'https://api.sandbox.push.apple.com' if settings.apns_use_sandbox else 'https://api.push.apple.com'
    request_payload = {
        'aps': {
            'alert': {
                'title': payload['title'],
                'body': payload['body'],
            },
            'sound': 'default',
        },
        **{key: value for key, value in payload.items() if key not in {'title', 'body'}},
    }
    async with httpx.AsyncClient(http2=True, timeout=10) as client:
        response = await client.post(
            f'{host}/3/device/{token.push_token}',
            headers={
                'authorization': f'bearer {_create_apns_jwt()}',
                'apns-topic': settings.apns_bundle_id,
                'apns-push-type': 'alert',
            },
            json=request_payload,
        )

    if response.status_code < 400:
        return NotificationSendAttempt(token.id, token.push_token, success=True, provider='apns')

    reason = ''
    try:
        reason = response.json().get('reason', '')
    except ValueError:
        reason = response.text
    deactivate = reason in {'BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'} or response.status_code == 410
    return NotificationSendAttempt(
        token.id,
        token.push_token,
        success=False,
        deactivate=deactivate,
        provider='apns',
        error_code=f'apns_{response.status_code}',
    )


async def emit_post_commit_order_notifications(
    db: AsyncSession,
    *,
    event: str,
    order: Order,
) -> None:
    if not settings.push_enabled:
        log_structured(
            logger,
            logging.INFO,
            'notifications.push_disabled',
            {'event': event, 'order_id': str(order.id)},
        )
        return

    try:
        log_structured(
            logger,
            logging.INFO,
            'notifications.order_dispatch_started',
            {'event': event, 'order_id': str(order.id)},
        )
        if event == 'order.created':
            await send_order_notification_to_admins(db, notification_type='admin_new_order', order=order)
            if order.order_type == OrderType.DELIVERY:
                await send_order_notification_to_admins(
                    db,
                    notification_type='admin_driver_assignment_needed',
                    order=order,
                )
            return

        if event == 'order.accepted':
            await send_order_notification_to_users(
                db,
                notification_type='client_order_accepted',
                order=order,
                user_ids=[order.user_id],
            )
            return

        if event == 'order.driver_assigned':
            await send_order_notification_to_users(
                db,
                notification_type='driver_order_assigned',
                order=order,
                user_ids=[order.assigned_driver_id] if order.assigned_driver_id else [],
            )
            await send_order_notification_to_users(
                db,
                notification_type='client_driver_assigned',
                order=order,
                user_ids=[order.user_id],
            )
            return

        if event == 'order.status_changed':
            if order.status == OrderStatus.OUT_FOR_DELIVERY:
                await send_order_notification_to_users(
                    db,
                    notification_type='client_out_for_delivery',
                    order=order,
                    user_ids=[order.user_id],
                )
            elif order.status == OrderStatus.DELIVERED:
                await send_order_notification_to_users(
                    db,
                    notification_type='client_order_delivered',
                    order=order,
                    user_ids=[order.user_id],
                )
            elif order.status == OrderStatus.COMPLETED and order.order_type == OrderType.PICKUP:
                await send_order_notification_to_users(
                    db,
                    notification_type='client_order_completed',
                    order=order,
                    user_ids=[order.user_id],
                )
    except Exception as exc:
        log_structured(
            logger,
            logging.WARNING,
            'notifications.order_dispatch_failed',
            {'order_id': str(order.id), 'event': event, 'error': str(exc)},
        )


async def emit_post_commit_promotion_created_notification(db: AsyncSession, promotion: Promotion) -> None:
    try:
        await send_promotion_created_notification_to_clients(db, promotion=promotion)
    except Exception as exc:
        log_structured(
            logger,
            logging.WARNING,
            'notifications.promotion_dispatch_failed',
            {'promotion_id': str(promotion.id), 'error': str(exc)},
        )
