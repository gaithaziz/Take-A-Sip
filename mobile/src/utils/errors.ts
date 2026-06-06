import axios from 'axios';

type Translator = (key: string) => string;
type ErrorPayload = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  details?: Array<{ message?: unknown; msg?: unknown }>;
};

const normalizeMessage = (value: string) => value.trim().toLowerCase();

const extractPayloadMessages = (payload: ErrorPayload): string[] => {
  const messages: string[] = [];
  const append = (value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      messages.push(value.trim());
    }
  };

  if (Array.isArray(payload.detail)) {
    payload.detail.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        append((entry as { message?: unknown; msg?: unknown }).message);
        append((entry as { message?: unknown; msg?: unknown }).msg);
      } else {
        append(entry);
      }
    });
  } else {
    append(payload.detail);
  }

  append(payload.message);
  append(payload.error);
  payload.details?.forEach((entry) => {
    append(entry.message);
    append(entry.msg);
  });

  return messages;
};

const apiErrorKeyForMessage = (message: string): string | null => {
  const detail = normalizeMessage(message);

  if (detail.includes('banned')) return 'errors.userBanned';
  if (/(section|item|type|size|addon) target not found/.test(detail)) return 'errors.menuTargetMissing';
  if (detail.includes('entity not found')) return 'errors.menuTargetMissing';
  if (detail.includes('promotion not found')) return 'errors.promotionMissing';
  if (detail.includes('schedule not found')) return 'errors.scheduleMissing';
  if (detail.includes('loyalty rule not found')) return 'errors.promotionRuleMissing';
  if (detail.includes('distance band not found')) return 'errors.distanceBandMissing';
  if (detail.includes('user not found')) return 'errors.userNotFound';
  if (detail.includes('size not found')) return 'errors.menuTargetMissing';
  if (detail.includes('addon not available')) return 'errors.addonUnavailable';
  if (detail.includes('one of the menu elements is inactive')) return 'errors.menuItemUnavailable';
  if (detail.includes('order quantity exceeds product limit')) return 'errors.orderLimitExceeded';
  if (detail.includes('you already have an order in progress')) return 'errors.orderInProgress';
  if (detail.includes('delivery is temporarily unavailable')) return 'errors.deliveryUnavailable';
  if (detail.includes('no active delivery distance band')) return 'errors.deliveryUnavailable';
  if (detail.includes('delivery_address is required')) return 'errors.deliveryAddressRequired';
  if (detail.includes('delivery_lat') || detail.includes('invalid delivery coordinates')) return 'errors.deliveryAddressRequired';
  if (detail.includes('invalid order_type')) return 'errors.invalidOrder';
  if (detail.includes('invalid status')) return 'errors.invalidOrder';
  if (detail.includes('order cannot')) return 'errors.invalidOrder';
  if (detail.includes('not assignable')) return 'errors.invalidOrder';
  if (detail.includes('invalid promotion type')) return 'errors.invalidPromotion';
  if (detail.includes('invalid promotion target type')) return 'errors.invalidPromotionTarget';
  if (detail.includes('free delivery promotions require')) return 'errors.invalidFreeDeliveryRule';
  if (detail.includes('free_delivery_discount_percent')) return 'errors.invalidFreeDeliveryRule';
  if (detail.includes('buy_n_get_m_free promotions require')) return 'errors.invalidBuyGetRule';
  if (detail.includes('buy_quantity') || detail.includes('free_quantity')) return 'errors.invalidBuyGetRule';
  if (detail.includes('required_completed_orders')) return 'errors.invalidRequiredOrders';
  if (detail.includes('value must be') || detail.includes('promotions require a value')) return 'errors.invalidPromotionValue';
  if (detail.includes('days_of_week')) return 'errors.invalidScheduleDays';
  if (detail.includes('start_time must be') || detail.includes('end_time must be')) return 'errors.invalidScheduleTime';
  if (detail.includes('active distance bands must not overlap')) return 'errors.deliveryBandOverlap';
  if (detail.includes('fee_amount') || detail.includes('distance_km')) return 'errors.invalidDeliveryBand';
  if (detail.includes('role is not allowed')) return 'errors.staffRoleNotAllowed';
  if (detail.includes('only available for staff accounts')) return 'errors.staffActionUnavailable';
  if (detail.includes('your own account')) return 'errors.cannotModifyOwnAccount';
  if (detail.includes('cannot be permanently deleted')) return 'errors.staffDeleteUnavailable';
  if (detail.includes('archive the staff account')) return 'errors.staffArchiveFirst';

  return null;
};

export const getApiErrorMessage = (error: unknown, t: Translator): string => {
  if (!axios.isAxiosError(error)) {
    return t('errors.generic');
  }

  if (error.code === 'ECONNABORTED') {
    return t('errors.timeout');
  }

  if (!error.response) {
    return t('errors.network');
  }

  const status = error.response.status;
  const payload = (error.response.data ?? {}) as ErrorPayload;
  const messages = extractPayloadMessages(payload);
  const detail = messages.map(normalizeMessage).join(' ');

  if (status === 401) {
    return t('errors.authRequired');
  }

  if (status === 403 && detail.includes('banned')) {
    return t('errors.userBanned');
  }

  if (status === 403) {
    return t('errors.forbidden');
  }

  if (status >= 500) {
    return t('errors.server');
  }

  for (const message of messages) {
    const translationKey = apiErrorKeyForMessage(message);
    if (translationKey) {
      return t(translationKey);
    }
  }

  if (messages.length > 0) {
    return status === 422 ? t('validation.requiredFields') : t('errors.generic');
  }

  return t('errors.generic');
};
