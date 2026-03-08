import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OrderRead } from '@/types/api';

type Props = {
  order: OrderRead;
  onAccept: () => void;
};

export const OrderDetailsScreen = ({ order, onAccept }: Props) => {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.orderNumber}>
        {t('details.order')} #{order.order_number}
      </Text>
      <View style={styles.infoBlock}>
        <Text style={styles.line}>Customer: {order.customer_name || '-'}</Text>
        <Text style={styles.line}>{t('details.phone')}: {order.customer_phone || '-'}</Text>
        <Text style={styles.line}>
          {t('details.type')}: {order.order_type}
        </Text>
        <Text style={styles.line}>Address: {order.order_type === 'delivery' ? order.delivery_address || '-' : '-'}</Text>
        <Text style={styles.line}>
          {t('details.notes')}: {order.notes || '-'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>{t('details.items')}</Text>
      {order.items.map((item) => (
        <View style={styles.itemCard} key={item.id}>
          <Text style={styles.itemTitle}>
            {item.quantity}x {item.item_name_snapshot}
          </Text>
          <Text style={styles.itemLine}>Size: {item.size_snapshot}</Text>
          {item.addons.map((addon) => (
            <Text key={addon.id} style={styles.itemLine}>
              + {addon.addon_name_snapshot}
            </Text>
          ))}
        </View>
      ))}

      <Pressable style={styles.acceptButton} onPress={onAccept}>
        <Text style={styles.acceptText}>{t('details.accept')}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF3F9',
  },
  content: {
    padding: 14,
    paddingBottom: 24,
  },
  orderNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0C2340',
    marginBottom: 12,
  },
  infoBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#D8DFE8',
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  line: {
    fontSize: 17,
    color: '#2F3A47',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0C2340',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#D8DFE8',
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0C2340',
    marginBottom: 4,
  },
  itemLine: {
    color: '#2F3A47',
    fontSize: 16,
  },
  acceptButton: {
    marginTop: 12,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#0C2340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
