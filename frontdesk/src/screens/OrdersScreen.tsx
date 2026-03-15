import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OrderBanner } from '@/components/OrderBanner';
import { OrderCard } from '@/components/OrderCard';
import { OrderRead } from '@/types/api';

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
}: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [activeReprintOrderId, setActiveReprintOrderId] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={[styles.title, isRTL ? styles.rtlText : styles.ltrText]}>{t('orders.title')}</Text>
      </View>

      <View style={[styles.topActions, isRTL ? styles.topActionsRtl : null]}>
        <Pressable
          style={styles.actionButton}
          onPress={() => void i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
        >
          <Text style={[styles.actionText, isRTL ? styles.rtlText : styles.ltrText]}>
            {t('orders.language')}: {i18n.language.toUpperCase()}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onLogout}>
          <Text style={[styles.actionText, isRTL ? styles.rtlText : styles.ltrText]}>{t('orders.logout')}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} disabled={isPrintingTest} onPress={() => void handlePrinterTest()}>
          <Text style={[styles.actionText, isRTL ? styles.rtlText : styles.ltrText]}>
            {isPrintingTest ? t('orders.printing') : t('orders.printerTest')}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.connection, isRTL ? styles.rtlText : styles.ltrText]}>
        {t('orders.connection')}: {connectionState}
      </Text>

      <OrderBanner message={banner} onClose={clearBanner} isRTL={isRTL} />

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
            onAccept={() => void acceptOrder(item)}
            isRTL={isRTL}
            labels={{
              order: t('orders.order'),
              type: t('orders.type'),
              items: t('orders.items'),
              phone: t('orders.phone'),
              time: t('orders.time'),
              status: t('orders.status'),
              accept: t('orders.accept'),
              needsAssignment: t('orders.needsAssignment'),
              assignedTo: t('details.assignedTo'),
            }}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF3F9',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  topBar: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0C2340',
  },
  topActions: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  topActionsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  actionText: {
    fontWeight: '700',
    color: '#0C2340',
  },
  connection: {
    marginBottom: 10,
    color: '#3E4A59',
    fontWeight: '700',
  },
  failedSection: {
    backgroundColor: '#FFF6E8',
    borderWidth: 1,
    borderColor: '#F2D7A1',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7A4B00',
    marginBottom: 6,
  },
  failedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F2D7A1',
    padding: 8,
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
  },
  failedActionsRtl: {
    flexDirection: 'row-reverse',
  },
  smallButton: {
    backgroundColor: '#0C2340',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  smallGhostButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0C2340',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallGhostButtonText: {
    color: '#0C2340',
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 18,
    color: '#3E4A59',
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
