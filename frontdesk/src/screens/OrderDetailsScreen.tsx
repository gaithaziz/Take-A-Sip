import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { isRtlLanguage } from '@/i18n';
import { OrderRead, UserSummary } from '@/types/api';
import { formatLocalizedNumber } from '@/utils/localeFormat';
import { getDeliveryAddress, getOrderStatusLabel, getOrderTypeLabel, isDriverAssignmentStatus } from '@/utils/orderPresentation';
import { FrontdeskButton, FrontdeskCard, FrontdeskCompositeText, FrontdeskLabelValueText, SectionHeader } from '@/ui/frontdeskPrimitives';
import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

type Props = {
  order: OrderRead;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  drivers: UserSummary[];
  onAssignDriver: (driverUserId: string) => Promise<void>;
};

const canCancel = (status: OrderRead['status']) =>
  status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'ASSIGNED_TO_DRIVER';

const money = (value: string | number | null | undefined) => `${Number(value ?? 0).toFixed(2)} JOD`;

const getItemsSubtotal = (order: OrderRead) =>
  order.items.reduce((sum, item) => {
    const addons = item.addons.reduce((addonSum, addon) => addonSum + Number(addon.price_snapshot), 0);
    return sum + (Number(item.price_snapshot) + addons) * item.quantity;
  }, 0);

export const OrderDetailsScreen = ({ order, onAccept, onReject, onCancel, drivers, onAssignDriver }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = isRtlLanguage(i18n.resolvedLanguage ?? i18n.language);
  const localizedOrderNumber = Number.isFinite(Number(order.order_number))
    ? formatLocalizedNumber(Number(order.order_number), i18n.language)
    : order.order_number;
  const subtotal = Number(order.subtotal_amount ?? getItemsSubtotal(order));
  const discount = Number(order.discount_amount ?? 0);
  const total = Number(order.total_amount ?? subtotal - discount + Number(order.delivery_fee ?? 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FrontdeskCompositeText
        style={styles.orderNumber}
        isRTL={isRTL}
        numberOfLines={1}
        runs={[
          { text: `${t('details.order')} `, direction: isRTL ? 'rtl' : 'ltr' },
          { text: `#${localizedOrderNumber}`, direction: 'ltr' },
        ]}
      />

      <FrontdeskCard style={[styles.infoBlock, isRTL ? styles.infoBlockRtl : null]}>
        <FrontdeskLabelValueText label={t('details.customer')} value={order.customer_name || '-'} isRTL={isRTL} style={styles.line} numberOfLines={2} />
        <FrontdeskLabelValueText
          label={t('details.phone')}
          value={order.customer_phone || '-'}
          isRTL={isRTL}
          style={styles.line}
          valueDirection="ltr"
          numberOfLines={1}
        />
        <FrontdeskLabelValueText label={t('details.type')} value={getOrderTypeLabel(order.order_type, t)} isRTL={isRTL} style={styles.line} numberOfLines={1} />
        <FrontdeskLabelValueText label={t('orders.status')} value={getOrderStatusLabel(order.status, t)} isRTL={isRTL} style={styles.line} numberOfLines={1} />
        <FrontdeskLabelValueText
          label={t('details.address')}
          value={order.order_type === 'delivery' ? getDeliveryAddress(order) || '-' : '-'}
          isRTL={isRTL}
          style={styles.line}
          numberOfLines={2}
        />
        <FrontdeskLabelValueText label={t('details.notes')} value={order.notes || '-'} isRTL={isRTL} style={styles.line} numberOfLines={3} />
      </FrontdeskCard>

      <FrontdeskCard style={[styles.infoBlock, isRTL ? styles.infoBlockRtl : null]}>
        <FrontdeskLabelValueText label={isRTL ? 'المجموع الفرعي' : 'Subtotal'} value={money(subtotal)} isRTL={isRTL} style={styles.line} numberOfLines={1} />
        {discount > 0 ? (
          <FrontdeskLabelValueText label={isRTL ? 'الخصم' : 'Discount'} value={`-${money(discount)}`} isRTL={isRTL} style={styles.line} numberOfLines={1} />
        ) : null}
        {order.order_type === 'delivery' ? (
          <FrontdeskLabelValueText label={isRTL ? 'رسوم التوصيل' : 'Delivery Fee'} value={money(order.delivery_fee)} isRTL={isRTL} style={styles.line} numberOfLines={1} />
        ) : null}
        <FrontdeskLabelValueText label={isRTL ? 'الإجمالي' : 'Total'} value={money(total)} isRTL={isRTL} style={styles.line} numberOfLines={1} />
      </FrontdeskCard>

      <SectionHeader title={t('details.items')} isRTL={isRTL} />
      {order.items.map((item) => (
        <FrontdeskCard style={[styles.itemCard, isRTL ? styles.itemCardRtl : null]} key={item.id}>
          <FrontdeskCompositeText
            style={styles.itemTitle}
            isRTL={isRTL}
            numberOfLines={2}
            runs={[{ text: `${formatLocalizedNumber(item.quantity, i18n.language)}x ${item.item_name_snapshot}`, direction: 'ltr' }]}
          />
          <FrontdeskLabelValueText label={t('details.size')} value={item.size_snapshot} isRTL={isRTL} style={styles.itemLine} numberOfLines={1} />
          {item.addons.map((addon) => (
            <FrontdeskCompositeText
              key={addon.id}
              style={styles.itemLine}
              isRTL={isRTL}
              numberOfLines={1}
              runs={[{ text: `+ ${addon.addon_name_snapshot}`, direction: 'ltr' }]}
            />
          ))}
        </FrontdeskCard>
      ))}

      {order.status === 'NEW' ? (
        <View style={[styles.actionsRow, isRTL ? styles.actionsRowRtl : null]}>
          <FrontdeskButton
            label={t('details.accept')}
            onPress={onAccept}
            variant="primary"
            isRTL={isRTL}
            minHeight={frontdeskTheme.touch.large}
            style={styles.flexButton}
          />
          <FrontdeskButton
            label={t('details.reject')}
            onPress={onReject}
            variant="danger"
            isRTL={isRTL}
            minHeight={frontdeskTheme.touch.large}
            style={styles.flexButton}
          />
        </View>
      ) : null}

      {canCancel(order.status) ? (
        <FrontdeskButton
          label={t('details.cancel')}
          onPress={onCancel}
          variant="danger"
          isRTL={isRTL}
          minHeight={frontdeskTheme.touch.medium}
          style={styles.singleAction}
        />
      ) : null}

      {order.order_type === 'delivery' && isDriverAssignmentStatus(order.status) ? (
        <View style={[styles.assignWrap, isRTL ? styles.assignWrapRtl : null]}>
          <SectionHeader title={t('details.assignDriver')} isRTL={isRTL} />
          {drivers.length === 0 ? (
            <Text style={[styles.itemLine, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>{t('details.noDrivers')}</Text>
          ) : (
            drivers.map((driver) => (
              <FrontdeskButton
                key={driver.id}
                label={`${driver.first_name} ${driver.last_name}`}
                onPress={() => void onAssignDriver(driver.id)}
                variant="ghost"
                isRTL={isRTL}
                minHeight={frontdeskTheme.touch.medium}
                textStyle={isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr}
              />
            ))
          )}
        </View>
      ) : null}

      {order.assigned_driver_id ? (
        <FrontdeskLabelValueText
          label={t('details.assignedTo')}
          value={order.assigned_driver_name || order.assigned_driver_id}
          isRTL={isRTL}
          style={styles.itemLine}
          numberOfLines={2}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: frontdeskTheme.colors.background,
  },
  content: {
    padding: frontdeskTheme.spacing.md,
    paddingBottom: 20,
  },
  orderNumber: {
    ...frontdeskTheme.typography.titleLg,
    fontSize: 24,
    lineHeight: 30,
    color: frontdeskTheme.colors.textPrimary,
    marginBottom: frontdeskTheme.spacing.md,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  infoBlock: {
    marginBottom: frontdeskTheme.spacing.lg,
    borderColor: frontdeskTheme.colors.border,
  },
  infoBlockRtl: {
    alignItems: 'stretch',
  },
  line: {
    ...frontdeskTheme.typography.bodyStrong,
    color: '#4A463F',
    marginBottom: frontdeskTheme.spacing.xs,
    alignSelf: 'stretch',
    width: '100%',
  },
  itemCard: {
    marginBottom: frontdeskTheme.spacing.md,
    borderColor: frontdeskTheme.colors.borderSoft,
  },
  itemCardRtl: {
    alignItems: 'stretch',
  },
  itemTitle: {
    ...frontdeskTheme.typography.bodyStrong,
    fontSize: 16,
    color: frontdeskTheme.colors.textPrimary,
    marginBottom: frontdeskTheme.spacing.xs,
    alignSelf: 'stretch',
    width: '100%',
  },
  itemLine: {
    ...frontdeskTheme.typography.body,
    color: frontdeskTheme.colors.textSecondary,
    alignSelf: 'stretch',
    width: '100%',
  },
  actionsRow: {
    marginTop: frontdeskTheme.spacing.md,
    flexDirection: 'row',
    gap: frontdeskTheme.spacing.md,
  },
  actionsRowRtl: {
    flexDirection: 'row-reverse',
  },
  singleAction: {
    marginTop: frontdeskTheme.spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  assignWrap: {
    marginTop: frontdeskTheme.spacing.md,
    gap: frontdeskTheme.spacing.sm,
  },
  assignWrapRtl: {
    alignItems: 'stretch',
  },
});
