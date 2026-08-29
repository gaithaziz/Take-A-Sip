import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

import { isRtlLanguage } from '@/i18n';
import { OrderDetailsScreen } from '@/screens/OrderDetailsScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { useFrontdeskOrders } from '@/hooks/useFrontdeskOrders';
import { useAuth } from '@/state/AuthContext';
import { OrderRead } from '@/types/api';

type RootStackParamList = {
  Orders: undefined;
  Details: { order: OrderRead };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { token, recoverSession, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const realtime = useFrontdeskOrders(token, recoverSession);
  const isRTL = isRtlLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          animation: 'none',
          gestureDirection: isRTL ? 'horizontal-inverted' : 'horizontal',
          headerTitleStyle: {
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        }}
      >
        <Stack.Screen name="Orders" options={{ headerShown: false }}>
          {({ navigation }) => (
            <OrdersScreen
              orders={realtime.orders}
              failedPrints={realtime.failedPrints}
              isLoading={realtime.isLoading}
              connectionState={realtime.connectionState}
              banner={realtime.banner}
              clearBanner={realtime.clearBanner}
              refresh={realtime.refresh}
              acceptOrder={realtime.acceptOrder}
              rejectOrder={realtime.rejectOrder}
              cancelOrder={realtime.cancelOrder}
              completeOrder={realtime.completeOrder}
              markOrderReady={realtime.markOrderReady}
              markOrderOutForDelivery={realtime.markOrderOutForDelivery}
              markOrderDelivered={realtime.markOrderDelivered}
              printOrder={realtime.printOrder}
              onPrinterTest={realtime.printTestReceipt}
              onReprint={realtime.reprintFailedOrder}
              onDismissFailed={realtime.dismissFailedOrder}
              onLogout={() => void logout()}
              onOpenOrder={(order) => navigation.navigate('Details', { order })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Details"
          options={{
            title: t('details.title'),
            headerTitleAlign: 'center',
            headerTitleStyle: {
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          }}
        >
          {({ route, navigation }) => (
            <OrderDetailsScreen
              order={realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order}
              isAvailable={realtime.orders.some((item) => item.id === route.params.order.id)}
              onUnavailable={() => navigation.goBack()}
              drivers={realtime.availableDrivers}
              onAssignDriver={async (driverUserId) => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.assignDriver(current.id, driverUserId);
                navigation.goBack();
              }}
              onAccept={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.acceptOrder(current);
                navigation.goBack();
              }}
              onReject={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.rejectOrder(current);
              }}
              onCancel={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.cancelOrder(current);
              }}
              onComplete={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.completeOrder(current);
              }}
              onReady={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.markOrderReady(current);
              }}
              onOutForDelivery={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.markOrderOutForDelivery(current);
              }}
              onDelivered={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.markOrderDelivered(current);
              }}
              onPrint={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.printOrder(current);
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
