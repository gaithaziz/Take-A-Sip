import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OrderRead, UserSummary } from '@/types/api';
import { getDeliveryAddress, getOrderStatusLabel, getOrderTypeLabel, isDriverAssignmentStatus } from '@/utils/orderPresentation';

type Props = {
  order: OrderRead;
  onAccept: () => void;
  onReject: () => void;
  drivers: UserSummary[];
  onAssignDriver: (driverUserId: string) => Promise<void>;
};

export const OrderDetailsScreen = ({ order, onAccept, onReject, drivers, onAssignDriver }: Props) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.orderNumber, isRTL ? styles.rtlText : styles.ltrText]}>
        {t('details.order')} #{order.order_number}
      </Text>
      <View style={styles.infoBlock}>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.customer')}: {order.customer_name || '-'}
        </Text>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.phone')}: {order.customer_phone || '-'}
        </Text>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.type')}: {getOrderTypeLabel(order.order_type, t)}
        </Text>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('orders.status')}: {getOrderStatusLabel(order.status, t)}
        </Text>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.address')}: {order.order_type === 'delivery' ? getDeliveryAddress(order) || '-' : '-'}
        </Text>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.notes')}: {order.notes || '-'}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, isRTL ? styles.rtlText : styles.ltrText]}>{t('details.items')}</Text>
      {order.items.map((item) => (
        <View style={styles.itemCard} key={item.id}>
          <Text style={[styles.itemTitle, isRTL ? styles.rtlText : styles.ltrText]}>
            {item.quantity}x {item.item_name_snapshot}
          </Text>
          <Text style={[styles.itemLine, isRTL ? styles.rtlText : styles.ltrText]}>
            {t('details.size')}: {item.size_snapshot}
          </Text>
          {item.addons.map((addon) => (
            <Text key={addon.id} style={[styles.itemLine, isRTL ? styles.rtlText : styles.ltrText]}>
              + {addon.addon_name_snapshot}
            </Text>
          ))}
        </View>
      ))}

      {order.status === 'NEW' ? (
        <Pressable style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptText}>{t('details.accept')}</Text>
        </Pressable>
      ) : null}
      {(order.status === 'NEW' || order.status === 'ACCEPTED' || order.status === 'ASSIGNED' || order.status === 'ASSIGNED_TO_DRIVER') ? (
        <Pressable style={styles.rejectButton} onPress={onReject}>
          <Text style={styles.rejectText}>{t('details.reject')}</Text>
        </Pressable>
      ) : null}
      {order.order_type === 'delivery' && isDriverAssignmentStatus(order.status) ? (
        <View style={styles.assignWrap}>
          <Text style={[styles.sectionTitle, isRTL ? styles.rtlText : styles.ltrText]}>{t('details.assignDriver')}</Text>
          {drivers.length === 0 ? (
            <Text style={[styles.itemLine, isRTL ? styles.rtlText : styles.ltrText]}>{t('details.noDrivers')}</Text>
          ) : (
            drivers.map((driver) => (
              <Pressable key={driver.id} style={styles.assignButton} onPress={() => void onAssignDriver(driver.id)}>
                <Text style={styles.assignButtonText}>
                  {driver.first_name} {driver.last_name}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
      {order.assigned_driver_id ? (
        <Text style={[styles.itemLine, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.assignedTo')}: {order.assigned_driver_name || order.assigned_driver_id}
        </Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  orderNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3A2A1B',
    marginBottom: 14,
  },
  infoBlock: {
    backgroundColor: '#FFFEFB',
    borderRadius: 14,
    borderColor: '#E6D8C8',
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  line: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4A463F',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 10,
    color: '#3A2A1B',
  },
  itemCard: {
    backgroundColor: '#FFFEFB',
    borderRadius: 14,
    borderColor: '#E6D8C8',
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#3A2A1B',
    marginBottom: 6,
  },
  itemLine: {
    color: '#4C4A46',
    fontSize: 15,
    lineHeight: 22,
  },
  acceptButton: {
    marginTop: 14,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#6B3F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignWrap: {
    marginTop: 12,
    gap: 8,
  },
  rejectButton: {
    marginTop: 10,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFF7F5',
    borderColor: '#D26D5F',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    color: '#C13A2B',
    fontSize: 18,
    fontWeight: '700',
  },
  assignButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B3F1F',
    backgroundColor: '#FFFEFB',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  assignButtonText: {
    color: '#6B3F1F',
    fontWeight: '700',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
