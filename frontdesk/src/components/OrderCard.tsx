import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderRead } from '@/types/api';

type Props = {
  order: OrderRead;
  onPress: () => void;
  onAccept: () => void;
  labels: {
    order: string;
    type: string;
    items: string;
    phone: string;
    time: string;
    accept: string;
  };
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export const OrderCard = ({ order, onPress, onAccept, labels }: Props) => {
  const itemsSummary = order.items.map((item) => `${item.quantity}x ${item.item_name_snapshot}`).join(', ');
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.orderNo}>
        {labels.order} #{order.order_number}
      </Text>
      <Text style={styles.meta}>
        {labels.type}: {order.order_type}
      </Text>
      <Text style={styles.meta}>
        {labels.items}: {itemsSummary || '-'}
      </Text>
      <Text style={styles.meta}>
        {labels.phone}: {order.customer_phone || '-'}
      </Text>
      <Text style={styles.meta}>
        {labels.time}: {formatTime(order.created_at)}
      </Text>
      <Pressable style={styles.acceptButton} onPress={onAccept}>
        <Text style={styles.acceptText}>{labels.accept}</Text>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE1E7',
    marginBottom: 12,
  },
  orderNo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0C2340',
    marginBottom: 8,
  },
  meta: {
    fontSize: 16,
    color: '#333A44',
    marginBottom: 4,
  },
  acceptButton: {
    marginTop: 10,
    backgroundColor: '#0C2340',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
});
