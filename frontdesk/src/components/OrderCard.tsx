import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderRead } from '@/types/api';
import { getOrderStatusLabel, getOrderTypeLabel, needsDriverAssignment } from '@/utils/orderPresentation';

type Props = {
  order: OrderRead;
  onPress: () => void;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
  isRTL: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  labels: {
    order: string;
    type: string;
    items: string;
    phone: string;
    time: string;
    accept: string;
    needsAssignment: string;
    assignedTo: string;
    status: string;
    reject: string;
  };
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export const OrderCard = ({ order, onPress, onAccept, onReject, isAccepting, isRejecting, isRTL, t, labels }: Props) => {
  const itemsSummary = order.items.map((item) => `${item.quantity}x ${item.item_name_snapshot}`).join(', ');
  const isBusy = isAccepting || isRejecting;
  const statusMark =
    order.status === 'NEW'
      ? 'N'
      : order.status === 'ACCEPTED' || order.status === 'ASSIGNED' || order.status === 'ASSIGNED_TO_DRIVER'
        ? 'A'
        : order.status === 'CANCELLED'
          ? 'X'
          : '•';
  const statusTone =
    order.status === 'NEW'
      ? styles.statusNew
      : order.status === 'ACCEPTED' || order.status === 'ASSIGNED' || order.status === 'ASSIGNED_TO_DRIVER'
        ? styles.statusAccepted
        : order.status === 'CANCELLED'
          ? styles.statusCancelled
          : styles.statusNeutral;

  return (
    <View style={styles.card}>
      <Pressable style={styles.touchableBody} onPress={onPress}>
        <View style={[styles.headerRow, isRTL ? styles.headerRowRtl : null]}>
          <Text style={[styles.orderNo, isRTL ? styles.rtlText : styles.ltrText]}>
            {labels.order} #{order.order_number}
          </Text>
          <View style={[styles.statusChip, statusTone]}>
            <Text style={styles.statusChipText}>
              {statusMark} {getOrderStatusLabel(order.status, t)}
            </Text>
          </View>
        </View>
        <Text style={[styles.meta, isRTL ? styles.rtlText : styles.ltrText]}>
          {labels.type}: {getOrderTypeLabel(order.order_type, t)}
        </Text>
        <Text style={[styles.meta, isRTL ? styles.rtlText : styles.ltrText]}>
          {labels.items}: {itemsSummary || '-'}
        </Text>
        <Text style={[styles.meta, isRTL ? styles.rtlText : styles.ltrText]}>
          {labels.phone}: {order.customer_phone || '-'}
        </Text>
        <Text style={[styles.meta, isRTL ? styles.rtlText : styles.ltrText]}>
          {labels.time}: {formatTime(order.created_at)}
        </Text>
        {needsDriverAssignment(order) ? (
          <Text style={[styles.assignmentMeta, isRTL ? styles.rtlText : styles.ltrText]}>{labels.needsAssignment}</Text>
        ) : order.assigned_driver_id ? (
          <Text style={[styles.meta, isRTL ? styles.rtlText : styles.ltrText]}>
            {labels.assignedTo}: {order.assigned_driver_name || order.assigned_driver_id}
          </Text>
        ) : null}
      </Pressable>
      {(order.status === 'NEW' || order.status === 'ACCEPTED') && (
        <View style={[styles.actionsRow, isRTL ? styles.actionsRowRtl : null]}>
          {order.status === 'NEW' ? (
            <Pressable style={styles.acceptButton} disabled={isBusy} onPress={onAccept}>
              <Text style={styles.acceptText}>{isAccepting ? t('orders.accepting') : labels.accept}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.rejectButton} disabled={isBusy} onPress={onReject}>
            <Text style={styles.rejectText}>{isRejecting ? t('orders.rejecting') : labels.reject}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFEFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9E0D4',
    marginBottom: 12,
    shadowColor: '#4C3921',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  touchableBody: {
    borderRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  orderNo: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#3A2A1B',
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusNew: {
    backgroundColor: '#FFF2D9',
    borderColor: '#E8C891',
  },
  statusAccepted: {
    backgroundColor: '#EAF3FF',
    borderColor: '#BBD3F2',
  },
  statusCancelled: {
    backgroundColor: '#FCEBE7',
    borderColor: '#E9B8AD',
  },
  statusNeutral: {
    backgroundColor: '#EEF1F5',
    borderColor: '#CED7E3',
  },
  statusChipText: {
    color: '#4A3A25',
    fontSize: 12,
    fontWeight: '800',
  },
  meta: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4C4A46',
    marginBottom: 3,
  },
  assignmentMeta: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 15,
    color: '#8C5C09',
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionsRowRtl: {
    flexDirection: 'row-reverse',
  },
  acceptButton: {
    backgroundColor: '#6B3F1F',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    flex: 1,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: '#FFF7F5',
    borderRadius: 10,
    borderColor: '#D26D5F',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    flex: 1,
  },
  rejectText: {
    color: '#C13A2B',
    fontSize: 17,
    fontWeight: '700',
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
