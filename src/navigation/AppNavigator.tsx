import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from './types';
import { useTheme } from '../hooks/useTheme';
import { FloatingTabBar } from '../components/common/FloatingTabBar';

import { HomeScreen } from '../screens/HomeScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { AddTransactionModal } from '../screens/AddTransactionModal';
import { HistoryScreen } from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="AI" component={AIChatScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { theme, colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ presentation: 'card', headerShown: true, title: 'History', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} 
      />
      <Stack.Screen 
        name="AddTransaction" 
        component={AddTransactionModal} 
        options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} 
      />
    </Stack.Navigator>
  );
};
