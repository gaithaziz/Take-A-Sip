import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OrderRead, UserSummary } from '@/types/api';

type Props = {
  order: OrderRead;
  onAccept: () => void;
  drivers: UserSummary[];
  onAssignDriver: (driverUserId: string) => Promise<void>;
};

export const OrderDetailsScreen = ({ order, onAccept, drivers, onAssignDriver }: Props) => {
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
          {t('details.type')}: {order.order_type}
        </Text>
        <Text style={[styles.line, isRTL ? styles.rtlText : styles.ltrText]}>
          {t('details.address')}: {order.order_type === 'delivery' ? order.delivery_address || '-' : '-'}
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
      {order.order_type === 'delivery' && order.status === 'ACCEPTED' ? (
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
  assignWrap: {
    marginTop: 12,
    gap: 8,
  },
  assignButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0C2340',
    backgroundColor: '#FFFFFF',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  assignButtonText: {
    color: '#0C2340',
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
