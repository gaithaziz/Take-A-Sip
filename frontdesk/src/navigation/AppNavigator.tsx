import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

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
  const { token, logout } = useAuth();
  const { t } = useTranslation();
  const realtime = useFrontdeskOrders(token);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          animation: 'none',
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
          }}
        >
          {({ route, navigation }) => (
            <OrderDetailsScreen
              order={realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order}
              onAccept={async () => {
                const current =
                  realtime.orders.find((item) => item.id === route.params.order.id) ?? route.params.order;
                await realtime.acceptOrder(current);
                navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
