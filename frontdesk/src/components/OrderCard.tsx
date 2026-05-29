import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderRead } from '@/types/api';
import { formatLocalizedNumber, formatLocalizedTime } from '@/utils/localeFormat';
import { getOrderStatusLabel, getOrderTypeLabel, isPickupInProgressOrder, needsDriverAssignment } from '@/utils/orderPresentation';
import { FrontdeskButton, FrontdeskCard, FrontdeskCompositeText, FrontdeskLabelValueText, StatusChip } from '@/ui/frontdeskPrimitives';
import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

type Props = {
  order: OrderRead;
  onPress: () => void;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onComplete: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
  isCancelling: boolean;
  isCompleting: boolean;
  isRTL: boolean;
  density: 'compact' | 'comfortable';
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string;
  labels: {
    order: string;
    type: string;
    items: string;
    phone: string;
    time: string;
    accept: string;
    reject: string;
    cancel: string;
    complete: string;
    needsAssignment: string;
    assignedTo: string;
  };
};

const canCancel = (status: OrderRead['status']) =>
  status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'ASSIGNED_TO_DRIVER';

const getStatusTone = (status: OrderRead['status']): 'new' | 'accepted' | 'cancelled' | 'neutral' => {
  if (status === 'NEW') {
    return 'new';
  }
  if (status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'ASSIGNED_TO_DRIVER') {
    return 'accepted';
  }
  if (status === 'CANCELLED') {
    return 'cancelled';
  }
  return 'neutral';
};

export const OrderCard = ({
  order,
  onPress,
  onAccept,
  onReject,
  onCancel,
  onComplete,
  isAccepting,
  isRejecting,
  isCancelling,
  isCompleting,
  isRTL,
  density,
  t,
  language,
  labels,
}: Props) => {
  const itemsSummary = order.items
    .map((item) => `${formatLocalizedNumber(item.quantity, language)}x ${item.item_name_snapshot}`)
    .join(', ');
  const isBusy = isAccepting || isRejecting || isCancelling || isCompleting;
  const localizedOrderNumber = Number.isFinite(Number(order.order_number))
    ? formatLocalizedNumber(Number(order.order_number), language)
    : order.order_number;

  const isCompact = density === 'compact';

  return (
    <FrontdeskCard style={[styles.card, isCompact ? styles.cardCompact : styles.cardComfortable, isRTL ? styles.cardRtl : null]}>
      <Pressable style={[styles.touchableBody, isRTL ? styles.touchableBodyRtl : null]} onPress={onPress}>
        <View style={[styles.headerRow, isCompact ? styles.headerRowCompact : styles.headerRowComfortable, isRTL ? styles.headerRowRtl : null]}>
          <FrontdeskCompositeText
            style={[
              styles.orderNo,
              isCompact ? styles.orderNoCompact : styles.orderNoComfortable,
            ]}
            isRTL={isRTL}
            numberOfLines={1}
            runs={[
              { text: `${labels.order} `, direction: isRTL ? 'rtl' : 'ltr' },
              { text: `#${localizedOrderNumber}`, direction: 'ltr' },
            ]}
          />
          <StatusChip variant={getStatusTone(order.status)} isRTL={isRTL} text={getOrderStatusLabel(order.status, t)} />
        </View>
        <FrontdeskLabelValueText
          label={labels.type}
          value={getOrderTypeLabel(order.order_type, t)}
          isRTL={isRTL}
          style={[styles.meta, isCompact ? styles.metaCompact : styles.metaComfortable]}
          numberOfLines={1}
        />
        <FrontdeskLabelValueText
          label={labels.items}
          value={itemsSummary || '-'}
          isRTL={isRTL}
          style={[styles.meta, isCompact ? styles.metaCompact : styles.metaComfortable]}
          valueDirection="ltr"
          numberOfLines={2}
        />
        <FrontdeskLabelValueText
          label={labels.phone}
          value={order.customer_phone || '-'}
          isRTL={isRTL}
          style={[styles.meta, isCompact ? styles.metaCompact : styles.metaComfortable]}
          valueDirection="ltr"
          numberOfLines={1}
        />
        <FrontdeskLabelValueText
          label={labels.time}
          value={formatLocalizedTime(order.created_at, language)}
          isRTL={isRTL}
          style={[styles.meta, isCompact ? styles.metaCompact : styles.metaComfortable]}
          valueDirection="ltr"
          numberOfLines={1}
        />
        {needsDriverAssignment(order) ? (
          <Text allowFontScaling={false} style={[styles.assignmentMeta, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]} numberOfLines={1}>
            {labels.needsAssignment}
          </Text>
        ) : order.assigned_driver_id ? (
          <FrontdeskLabelValueText
            label={labels.assignedTo}
            value={order.assigned_driver_name || order.assigned_driver_id}
            isRTL={isRTL}
            style={styles.meta}
            numberOfLines={1}
          />
        ) : null}
      </Pressable>

      {(order.status === 'NEW' || canCancel(order.status) || isPickupInProgressOrder(order)) && (
        <View style={[styles.actionsRow, isCompact ? styles.actionsRowCompact : styles.actionsRowComfortable, isRTL ? styles.actionsRowRtl : null]}>
          {order.status === 'NEW' ? (
            <>
              <FrontdeskButton
                label={isAccepting ? t('orders.accepting') : labels.accept}
                onPress={onAccept}
                disabled={isBusy}
                variant="primary"
                isRTL={isRTL}
                minHeight={isCompact ? frontdeskTheme.touch.medium : frontdeskTheme.touch.large}
                style={styles.flexButton}
              />
              <FrontdeskButton
                label={isRejecting ? t('orders.rejecting') : labels.reject}
                onPress={onReject}
                disabled={isBusy}
                variant="danger"
                isRTL={isRTL}
                minHeight={isCompact ? frontdeskTheme.touch.medium : frontdeskTheme.touch.large}
                style={styles.flexButton}
              />
            </>
          ) : isPickupInProgressOrder(order) ? (
            <>
              <FrontdeskButton
                label={isCompleting ? t('orders.completing') : labels.complete}
                onPress={onComplete}
                disabled={isBusy}
                variant="primary"
                isRTL={isRTL}
                minHeight={isCompact ? frontdeskTheme.touch.min : frontdeskTheme.touch.medium}
                style={styles.flexButton}
              />
              <FrontdeskButton
                label={isCancelling ? t('orders.cancelling') : labels.cancel}
                onPress={onCancel}
                disabled={isBusy}
                variant="danger"
                isRTL={isRTL}
                minHeight={isCompact ? frontdeskTheme.touch.min : frontdeskTheme.touch.medium}
                style={styles.flexButton}
              />
            </>
          ) : (
            <FrontdeskButton
              label={isCancelling ? t('orders.cancelling') : labels.cancel}
              onPress={onCancel}
              disabled={isBusy}
              variant="danger"
              isRTL={isRTL}
              minHeight={isCompact ? frontdeskTheme.touch.min : frontdeskTheme.touch.medium}
              style={styles.flexButton}
            />
          )}
        </View>
      )}
    </FrontdeskCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderColor: frontdeskTheme.colors.border,
    borderRadius: frontdeskTheme.radius.xl,
  },
  cardCompact: {
    paddingVertical: frontdeskTheme.spacing.xs,
    paddingHorizontal: frontdeskTheme.spacing.sm,
    marginBottom: frontdeskTheme.spacing.xs,
  },
  cardComfortable: {
    paddingVertical: frontdeskTheme.spacing.md,
    paddingHorizontal: frontdeskTheme.spacing.md,
    marginBottom: frontdeskTheme.spacing.sm,
  },
  touchableBody: {
    borderRadius: frontdeskTheme.radius.md,
    width: '100%',
  },
  touchableBodyRtl: {
    alignItems: 'flex-end',
  },
  cardRtl: {
    alignItems: 'stretch',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerRowCompact: {
    marginBottom: frontdeskTheme.spacing.xs,
    gap: frontdeskTheme.spacing.xs,
  },
  headerRowComfortable: {
    marginBottom: frontdeskTheme.spacing.sm,
    gap: frontdeskTheme.spacing.sm,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  orderNo: {
    ...frontdeskTheme.typography.titleMd,
    color: frontdeskTheme.colors.textPrimary,
    flexShrink: 1,
    minWidth: 0,
  },
  orderNoCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  orderNoComfortable: {
    fontSize: 18,
    lineHeight: 24,
  },
  meta: {
    ...frontdeskTheme.typography.body,
    color: frontdeskTheme.colors.textSecondary,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  metaCompact: {
    marginBottom: frontdeskTheme.spacing.xxs,
  },
  metaComfortable: {
    marginBottom: frontdeskTheme.spacing.xs,
  },
  assignmentMeta: {
    marginTop: frontdeskTheme.spacing.xs,
    marginBottom: frontdeskTheme.spacing.xs,
    ...frontdeskTheme.typography.body,
    color: '#8C5C09',
    fontWeight: '700',
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsRowCompact: {
    marginTop: frontdeskTheme.spacing.xs,
    gap: frontdeskTheme.spacing.xs,
  },
  actionsRowComfortable: {
    marginTop: frontdeskTheme.spacing.sm,
    gap: frontdeskTheme.spacing.sm,
  },
  actionsRowRtl: {
    flexDirection: 'row-reverse',
  },
  flexButton: {
    flex: 1,
  },
});
