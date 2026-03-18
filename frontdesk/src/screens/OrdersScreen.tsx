import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderBanner } from '@/components/OrderBanner';
import { OrderCard } from '@/components/OrderCard';
import { OrderRead } from '@/types/api';
import { needsDriverAssignment } from '@/utils/orderPresentation';

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
}: Props) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.dir() === 'rtl';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [activeReprintOrderId, setActiveReprintOrderId] = useState<string | null>(null);
  const [activeAcceptOrderId, setActiveAcceptOrderId] = useState<string | null>(null);
  const [activeRejectOrderId, setActiveRejectOrderId] = useState<string | null>(null);
  const dockBottom = Math.max(10, insets.bottom + 6);
  const listBottomPadding = 86 + dockBottom;

  const newOrders = orders.filter((order) => order.status === 'NEW');
  const assignmentOrders = orders.filter(needsDriverAssignment);

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

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={[styles.title, isRTL ? styles.rtlText : styles.ltrText]}>{t('orders.title')}</Text>
      </View>

      <View
        style={[
          styles.connectionPill,
          connectionState === 'connected' ? styles.connected : styles.disconnected,
          isRTL ? styles.connectionPillRtl : null,
        ]}
      >
        <Text style={[styles.connectionText, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('orders.connection')}: {t(`orders.connectionState.${connectionState}`)}
        </Text>
      </View>

      <View style={[styles.summaryRow, isRTL ? styles.summaryRowRtl : null]}>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryText}>{t('orders.newCount', { count: newOrders.length })}</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryText}>{t('orders.assignmentCount', { count: assignmentOrders.length })}</Text>
        </View>
      </View>

      <OrderBanner message={banner} onClose={clearBanner} isRTL={isRTL} closeLabel={t('orders.closeBanner')} />

      {failedPrints.length > 0 ? (
        <View style={styles.failedSection}>
          <Text style={[styles.failedTitle, isRTL ? styles.rtlText : styles.ltrText]}>
            {t('orders.failedPrints')}
          </Text>
          {failedPrints.map((job) => (
            <View key={job.order.id} style={styles.failedCard}>
              <Text style={[styles.failedText, isRTL ? styles.rtlText : styles.ltrText]}>
                #{job.order.order_number} - {job.reason}
              </Text>
              <View style={[styles.failedActions, isRTL ? styles.failedActionsRtl : null]}>
                <Pressable
                  style={styles.smallButton}
                  disabled={activeReprintOrderId === job.order.id}
                  onPress={() => void handleReprint(job.order.id)}
                >
                  <Text style={styles.smallButtonText}>
                    {activeReprintOrderId === job.order.id ? t('orders.printing') : t('orders.reprint')}
                  </Text>
                </Pressable>
                <Pressable style={styles.smallGhostButton} onPress={() => onDismissFailed(job.order.id)}>
                  <Text style={styles.smallGhostButtonText}>{t('orders.dismiss')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.empty, isRTL ? styles.rtlText : styles.ltrText]}>{t('orders.loading')}</Text>
          ) : (
            <Text style={[styles.empty, isRTL ? styles.rtlText : styles.ltrText]}>{t('orders.empty')}</Text>
          )
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => onOpenOrder(item)}
            onAccept={() => void handleAccept(item)}
            onReject={() => void handleReject(item)}
            isAccepting={activeAcceptOrderId === item.id}
            isRejecting={activeRejectOrderId === item.id}
            isRTL={isRTL}
            t={t}
            labels={{
              order: t('orders.order'),
              type: t('orders.type'),
              items: t('orders.items'),
              phone: t('orders.phone'),
              time: t('orders.time'),
              status: t('orders.status'),
              accept: t('orders.accept'),
              reject: t('orders.reject'),
              needsAssignment: t('orders.needsAssignment'),
              assignedTo: t('details.assignedTo'),
            }}
          />
        )}
      />

      <View style={[styles.bottomDock, { bottom: dockBottom }, isRTL ? styles.bottomDockRtl : null]}>
        <Pressable
          style={[styles.dockButton, styles.dockSecondary]}
          onPress={() => void i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
        >
          <Text style={styles.dockText}>{i18n.language.toUpperCase()}</Text>
        </Pressable>
        <Pressable
          style={[styles.dockButton, styles.dockPrimary]}
          disabled={isPrintingTest}
          onPress={() => void handlePrinterTest()}
        >
          <Text style={styles.dockPrimaryText}>{isPrintingTest ? t('orders.printing') : t('orders.printerTest')}</Text>
        </Pressable>
        <Pressable style={[styles.dockButton, styles.dockDanger]} onPress={onLogout}>
          <Text style={styles.dockDangerText}>{t('orders.logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topBar: {
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3A2A1B',
  },
  connectionPill: {
    marginBottom: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  connectionPillRtl: {
    alignSelf: 'flex-end',
  },
  connected: {
    backgroundColor: '#E7F3E8',
  },
  disconnected: {
    backgroundColor: '#F7E6E3',
  },
  connectionText: {
    color: '#3D3A34',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  summaryRowRtl: {
    flexDirection: 'row-reverse',
  },
  summaryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFEFB',
    borderColor: '#E6D8C8',
    borderWidth: 1,
  },
  summaryText: {
    color: '#5A4635',
    fontWeight: '700',
  },
  failedSection: {
    backgroundColor: '#FFF7EC',
    borderWidth: 1,
    borderColor: '#E8CFA5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7A4B00',
    marginBottom: 6,
  },
  failedCard: {
    backgroundColor: '#FFFEFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8CFA5',
    padding: 10,
    marginBottom: 8,
  },
  failedText: {
    color: '#6A4A15',
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  failedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  failedActionsRtl: {
    flexDirection: 'row-reverse',
  },
  smallButton: {
    backgroundColor: '#6B3F1F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  smallGhostButton: {
    backgroundColor: '#FFFEFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B3F1F',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallGhostButtonText: {
    color: '#6B3F1F',
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 17,
    color: '#6A6258',
  },
  listContent: {
    paddingBottom: 86,
  },
  bottomDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFEFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D8C8',
    padding: 8,
    shadowColor: '#4C3921',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  bottomDockRtl: {
    flexDirection: 'row-reverse',
  },
  dockButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  dockSecondary: {
    flexBasis: 64,
    backgroundColor: '#F6EFE5',
    borderWidth: 1,
    borderColor: '#E6D8C8',
  },
  dockPrimary: {
    flex: 1,
    backgroundColor: '#6B3F1F',
  },
  dockDanger: {
    flexBasis: 86,
    backgroundColor: '#FFF3F0',
    borderWidth: 1,
    borderColor: '#D9AEA7',
  },
  dockText: {
    color: '#4C3A28',
    fontWeight: '800',
  },
  dockPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dockDangerText: {
    color: '#B84A39',
    fontWeight: '800',
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
