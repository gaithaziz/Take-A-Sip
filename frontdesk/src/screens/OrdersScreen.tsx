import { useEffect, useRef, useState } from 'react';
import { FlatList, LayoutAnimation, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isRtlLanguage } from '@/i18n';
import { OrderBanner } from '@/components/OrderBanner';
import { OrderCard } from '@/components/OrderCard';
import { OrderRead } from '@/types/api';
import { formatLocalizedNumber } from '@/utils/localeFormat';
import { needsDriverAssignment } from '@/utils/orderPresentation';
import { FrontdeskButton, FrontdeskCard, FrontdeskCompositeText, FrontdeskLabelValueText } from '@/ui/frontdeskPrimitives';
import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

type Props = {
  onOpenOrder: (order: OrderRead) => void;
  onLogout: () => void;
  onPrinterTest: () => Promise<void>;
  failedPrints: Array<{ order: OrderRead; reason: string; failedAt: number }>;
  onReprint: (orderId: string) => Promise<void>;
  onDismissFailed: (orderId: string) => void;
  orders: OrderRead[];
  isLoading: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  banner: string | null;
  clearBanner: () => void;
  refresh: () => Promise<void>;
  acceptOrder: (order: OrderRead) => Promise<void>;
  rejectOrder: (order: OrderRead) => Promise<void>;
  cancelOrder: (order: OrderRead) => Promise<void>;
};

export const OrdersScreen = ({
  onOpenOrder,
  onLogout,
  onPrinterTest,
  failedPrints,
  onReprint,
  onDismissFailed,
  orders,
  isLoading,
  connectionState,
  banner,
  clearBanner,
  refresh,
  acceptOrder,
  rejectOrder,
  cancelOrder,
}: Props) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = isRtlLanguage(i18n.resolvedLanguage ?? i18n.language);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [activeReprintOrderId, setActiveReprintOrderId] = useState<string | null>(null);
  const [activeAcceptOrderId, setActiveAcceptOrderId] = useState<string | null>(null);
  const [activeRejectOrderId, setActiveRejectOrderId] = useState<string | null>(null);
  const [activeCancelOrderId, setActiveCancelOrderId] = useState<string | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const dockBottom = Math.max(10, insets.bottom + 6);
  const listBottomPadding = 132 + dockBottom;
  const previousFailedCountRef = useRef(failedPrints.length);

  const newOrders = orders.filter((order) => order.status === 'NEW');
  const assignmentOrders = orders.filter(needsDriverAssignment);
  const localizedNewCount = formatLocalizedNumber(newOrders.length, i18n.language);
  const localizedAssignmentCount = formatLocalizedNumber(assignmentOrders.length, i18n.language);
  const connectionIcon = connectionState === 'connected' ? '[OK]' : connectionState === 'connecting' ? '[..]' : '[X]';

  useEffect(() => {
    if (previousFailedCountRef.current !== failedPrints.length) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      previousFailedCountRef.current = failedPrints.length;
    }
  }, [failedPrints.length]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReprint = async (orderId: string) => {
    setActiveReprintOrderId(orderId);
    try {
      await onReprint(orderId);
    } finally {
      setActiveReprintOrderId((current) => (current === orderId ? null : current));
    }
  };

  const handlePrinterTest = async () => {
    setIsPrintingTest(true);
    try {
      await onPrinterTest();
    } finally {
      setIsPrintingTest(false);
    }
  };

  const handleAccept = async (order: OrderRead) => {
    setActiveAcceptOrderId(order.id);
    try {
      await acceptOrder(order);
    } finally {
      setActiveAcceptOrderId((current) => (current === order.id ? null : current));
    }
  };

  const handleReject = async (order: OrderRead) => {
    setActiveRejectOrderId(order.id);
    try {
      await rejectOrder(order);
    } finally {
      setActiveRejectOrderId((current) => (current === order.id ? null : current));
    }
  };

  const handleCancel = async (order: OrderRead) => {
    setActiveCancelOrderId(order.id);
    try {
      await cancelOrder(order);
    } finally {
      setActiveCancelOrderId((current) => (current === order.id ? null : current));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, isRTL ? styles.topBarRtl : styles.topBarLtr]}>
        <FrontdeskCompositeText style={styles.title} isRTL={isRTL} runs={[{ text: t('orders.title'), direction: 'rtl' }]} />
      </View>

      <View
        style={[
          styles.connectionPill,
          connectionState === 'connected' ? styles.connected : styles.disconnected,
          isRTL ? styles.connectionPillRtl : null,
        ]}
      >
        <FrontdeskCompositeText
          style={styles.connectionText}
          isRTL={isRTL}
          numberOfLines={1}
          runs={[
            { text: `${t('orders.connection')}: `, direction: 'rtl' },
            { text: t(`orders.connectionState.${connectionState}`), direction: 'rtl' },
            { text: ' ', direction: 'rtl' },
            { text: connectionIcon, direction: 'ltr' },
          ]}
        />
      </View>

      <View style={[styles.summaryRow, isRTL ? styles.summaryRowRtl : null]}>
        <FrontdeskCard elevated={false} style={[styles.summaryChip, isRTL ? styles.summaryChipRtl : null]}>
          <FrontdeskLabelValueText
            label={t('orders.newLabel')}
            value={localizedNewCount}
            isRTL={isRTL}
            style={styles.summaryText}
            valueDirection="ltr"
          />
        </FrontdeskCard>
        <FrontdeskCard elevated={false} style={[styles.summaryChip, isRTL ? styles.summaryChipRtl : null]}>
          <FrontdeskLabelValueText
            label={t('orders.assignmentLabel')}
            value={localizedAssignmentCount}
            isRTL={isRTL}
            style={styles.summaryText}
            valueDirection="ltr"
          />
        </FrontdeskCard>
      </View>

      <OrderBanner message={banner} onClose={clearBanner} isRTL={isRTL} closeLabel={t('orders.closeBanner')} />

      {failedPrints.length > 0 ? (
        <FrontdeskCard elevated={false} style={[styles.failedSection, isRTL ? styles.failedSectionRtl : null]}>
          <Text style={[styles.failedTitle, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>
            {t('orders.failedPrints')}
          </Text>
          {failedPrints.map((job) => (
            <FrontdeskCard elevated={false} key={job.order.id} style={[styles.failedCard, isRTL ? styles.failedCardRtl : null]}>
              <FrontdeskCompositeText
                style={styles.failedText}
                isRTL={isRTL}
                numberOfLines={2}
                runs={[
                  { text: `#${job.order.order_number}`, direction: 'ltr' },
                  { text: ' - ', direction: 'ltr' },
                  { text: job.reason, direction: 'rtl' },
                ]}
              />
              <View style={[styles.failedActions, isRTL ? styles.failedActionsRtl : null]}>
                <FrontdeskButton
                  label={activeReprintOrderId === job.order.id ? t('orders.printing') : t('orders.reprint')}
                  disabled={activeReprintOrderId === job.order.id}
                  onPress={() => void handleReprint(job.order.id)}
                  variant="primary"
                  isRTL={isRTL}
                  minHeight={frontdeskTheme.touch.min}
                  style={styles.smallAction}
                />
                <FrontdeskButton
                  label={t('orders.dismiss')}
                  onPress={() => onDismissFailed(job.order.id)}
                  variant="ghost"
                  isRTL={isRTL}
                  minHeight={frontdeskTheme.touch.min}
                  style={styles.smallAction}
                />
              </View>
            </FrontdeskCard>
          ))}
        </FrontdeskCard>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          density === 'comfortable' ? styles.listContentComfortable : styles.listContentCompact,
          { paddingBottom: listBottomPadding },
        ]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>{t('orders.loading')}</Text>
          ) : (
            <Text style={[styles.empty, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>{t('orders.empty')}</Text>
          )
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => onOpenOrder(item)}
            onAccept={() => void handleAccept(item)}
            onReject={() => void handleReject(item)}
            onCancel={() => void handleCancel(item)}
            isAccepting={activeAcceptOrderId === item.id}
            isRejecting={activeRejectOrderId === item.id}
            isCancelling={activeCancelOrderId === item.id}
            isRTL={isRTL}
            density={density}
            t={t}
            language={i18n.language}
            labels={{
              order: t('orders.order'),
              type: t('orders.type'),
              items: t('orders.items'),
              phone: t('orders.phone'),
              time: t('orders.time'),
              accept: t('orders.accept'),
              reject: t('orders.reject'),
              cancel: t('orders.cancel'),
              needsAssignment: t('orders.needsAssignment'),
              assignedTo: t('details.assignedTo'),
            }}
          />
        )}
      />

      <FrontdeskCard elevated={false} style={[styles.bottomDock, { bottom: dockBottom }]}>
        <View style={[styles.dockRow, isRTL ? styles.dockRowRtl : null]}>
          <FrontdeskButton
            label={density === 'compact' ? t('orders.densityCompact') : t('orders.densityComfortable')}
            onPress={() => setDensity((current) => (current === 'compact' ? 'comfortable' : 'compact'))}
            variant="secondary"
            isRTL={isRTL}
            minHeight={frontdeskTheme.touch.min}
            style={styles.dockHalf}
          />
          <FrontdeskButton
            label={i18n.language.toUpperCase()}
            onPress={() => void i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
            variant="secondary"
            isRTL={isRTL}
            minHeight={frontdeskTheme.touch.min}
            style={styles.dockHalf}
          />
        </View>
        <View style={[styles.dockRow, isRTL ? styles.dockRowRtl : null]}>
          <FrontdeskButton
            label={isPrintingTest ? t('orders.printing') : t('orders.printerTest')}
            onPress={() => void handlePrinterTest()}
            disabled={isPrintingTest}
            variant="primary"
            isRTL={isRTL}
            minHeight={frontdeskTheme.touch.min}
            style={styles.dockHalf}
          />
          <FrontdeskButton
            label={t('orders.logout')}
            onPress={onLogout}
            variant="danger"
            isRTL={isRTL}
            minHeight={frontdeskTheme.touch.min}
            style={styles.dockHalf}
          />
        </View>
      </FrontdeskCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: frontdeskTheme.colors.background,
    paddingHorizontal: frontdeskTheme.spacing.md,
    paddingTop: frontdeskTheme.spacing.md,
  },
  topBar: {
    marginBottom: frontdeskTheme.spacing.sm,
    width: '100%',
  },
  topBarRtl: {
    alignItems: 'stretch',
  },
  topBarLtr: {
    alignItems: 'stretch',
  },
  title: {
    ...frontdeskTheme.typography.titleLg,
    fontSize: 24,
    lineHeight: 30,
    color: frontdeskTheme.colors.textPrimary,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  connectionPill: {
    marginBottom: frontdeskTheme.spacing.md,
    borderRadius: frontdeskTheme.radius.pill,
    paddingHorizontal: frontdeskTheme.spacing.lg,
    paddingVertical: frontdeskTheme.spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  connectionPillRtl: {
    marginLeft: 'auto',
  },
  connected: {
    backgroundColor: frontdeskTheme.colors.successBg,
    borderColor: '#B9D9BF',
  },
  disconnected: {
    backgroundColor: frontdeskTheme.colors.errorBg,
    borderColor: '#E4B7B0',
  },
  connectionText: {
    ...frontdeskTheme.typography.body,
    fontWeight: '700',
    color: '#3D3A34',
    alignSelf: 'stretch',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: frontdeskTheme.spacing.sm,
    gap: frontdeskTheme.spacing.sm,
  },
  summaryRowRtl: {
    flexDirection: 'row-reverse',
  },
  summaryChip: {
    flex: 1,
    borderRadius: frontdeskTheme.radius.pill,
    paddingVertical: frontdeskTheme.spacing.sm,
    paddingHorizontal: frontdeskTheme.spacing.md,
    borderColor: frontdeskTheme.colors.border,
  },
  summaryChipRtl: {
    alignItems: 'flex-end',
  },
  summaryText: {
    ...frontdeskTheme.typography.body,
    fontWeight: '700',
    color: '#5A4635',
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  failedSection: {
    backgroundColor: frontdeskTheme.colors.warningBg,
    borderColor: frontdeskTheme.colors.warningBorder,
    marginBottom: frontdeskTheme.spacing.md,
    borderRadius: frontdeskTheme.radius.lg,
  },
  failedSectionRtl: {
    alignItems: 'stretch',
  },
  failedTitle: {
    ...frontdeskTheme.typography.bodyStrong,
    color: '#7A4B00',
    marginBottom: frontdeskTheme.spacing.xs,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  failedCard: {
    borderColor: frontdeskTheme.colors.warningBorder,
    marginBottom: frontdeskTheme.spacing.sm,
    padding: frontdeskTheme.spacing.md,
    borderRadius: frontdeskTheme.radius.lg,
  },
  failedCardRtl: {
    alignItems: 'stretch',
  },
  failedText: {
    ...frontdeskTheme.typography.body,
    color: '#6A4A15',
    marginBottom: frontdeskTheme.spacing.sm,
    fontWeight: '600',
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  failedActions: {
    flexDirection: 'row',
    gap: frontdeskTheme.spacing.sm,
  },
  failedActionsRtl: {
    flexDirection: 'row-reverse',
  },
  smallAction: {
    flex: 1,
  },
  empty: {
    ...frontdeskTheme.typography.bodyStrong,
    textAlign: 'center',
    marginTop: 28,
    color: frontdeskTheme.colors.textTertiary,
  },
  listContent: {
    paddingBottom: 132,
  },
  listContentCompact: {
    paddingTop: frontdeskTheme.spacing.xs,
  },
  listContentComfortable: {
    paddingTop: frontdeskTheme.spacing.md,
  },
  bottomDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    gap: frontdeskTheme.spacing.xs,
    borderRadius: frontdeskTheme.radius.lg,
    borderColor: frontdeskTheme.colors.border,
    padding: frontdeskTheme.spacing.sm,
    ...frontdeskTheme.elevation.dock,
  },
  dockRow: {
    flexDirection: 'row',
    gap: frontdeskTheme.spacing.xs,
  },
  dockRowRtl: {
    flexDirection: 'row-reverse',
  },
  dockHalf: {
    flex: 1,
  },
});
