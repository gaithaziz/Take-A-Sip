import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OrderDetailsScreen } from '@/screens/OrderDetailsScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { useFrontdeskOrders } from '@/hooks/useFrontdeskOrders';
import { useAuth } from '@/state/AuthContext';
import { OrderRead } from '@/types/api';

type RootStackParamList = {
  Orders: undefined;
  Details: { order: OrderRead };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { token, logout } = useAuth();
  const realtime = useFrontdeskOrders(token);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Orders" options={{ headerShown: false }}>
          {({ navigation }) => (
            <OrdersScreen
              orders={realtime.orders}
              isLoading={realtime.isLoading}
              connectionState={realtime.connectionState}
              banner={realtime.banner}
              clearBanner={realtime.clearBanner}
              refresh={realtime.refresh}
              acceptOrder={realtime.acceptOrder}
              onLogout={() => void logout()}
              onOpenOrder={(order) => navigation.navigate('Details', { order })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Details" options={{ title: 'Order Details' }}>
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
