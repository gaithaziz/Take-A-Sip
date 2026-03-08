import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OrderBanner } from '@/components/OrderBanner';
import { OrderCard } from '@/components/OrderCard';
import { OrderRead } from '@/types/api';

type Props = {
  onOpenOrder: (order: OrderRead) => void;
  onLogout: () => void;
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
  orders,
  isLoading,
  connectionState,
  banner,
  clearBanner,
  refresh,
  acceptOrder,
}: Props) => {
  const { t, i18n } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t('orders.title')}</Text>
        <View style={styles.topActions}>
          <Pressable
            style={styles.langButton}
            onPress={() => void i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
          >
            <Text style={styles.langText}>{i18n.language.toUpperCase()}</Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>{t('orders.logout')}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.connection}>
        {t('orders.connection')}: {connectionState}
      </Text>

      <OrderBanner message={banner} onClose={clearBanner} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          isLoading ? <Text style={styles.empty}>{t('orders.loading')}</Text> : <Text style={styles.empty}>{t('orders.empty')}</Text>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => onOpenOrder(item)}
            onAccept={() => void acceptOrder(item)}
            labels={{
              order: t('orders.order'),
              type: t('orders.type'),
              items: t('orders.items'),
              phone: t('orders.phone'),
              time: t('orders.time'),
              accept: t('orders.accept'),
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0C2340',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  langText: {
    fontWeight: '700',
    color: '#0C2340',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    fontWeight: '700',
    color: '#0C2340',
  },
  connection: {
    marginBottom: 10,
    color: '#3E4A59',
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 18,
    color: '#3E4A59',
  },
});
