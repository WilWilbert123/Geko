import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Home, CreditCard, Plus, MessageSquare, BarChart3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const FloatingTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const currentRoute = state.routes[state.index].name;

  const tabs = [
    {
      id: 'Home',
      label: 'Home',
      icon: Home,
      routeName: 'Home',
      isFocused: currentRoute === 'Home',
    },
    {
      id: 'Wallet',
      label: 'Wallet/Accounts',
      icon: CreditCard,
      routeName: 'Wallet',
      isFocused: currentRoute === 'Wallet',
    },
    {
      id: 'QuickAdd',
      label: 'Quick Add',
      isCenter: true,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('AddTransaction');
      },
    },
    {
      id: 'AI',
      label: 'Chat Geko',
      icon: MessageSquare,
      routeName: 'AI',
      isFocused: currentRoute === 'AI',
    },
    {
      id: 'Plan',
      label: 'More',
      icon: BarChart3,
      routeName: 'Plan',
      isFocused: currentRoute === 'Plan',
    },
  ];

  return (
    <View
      style={[
        styles.dockedContainer,
        {
          backgroundColor: isDark ? '#0B0F19' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {tabs.map((t) => {
          if (t.isCenter) {
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.centerTabContainer}
                onPress={t.onPress}
                activeOpacity={0.85}
              >
                <View style={styles.centerGreenButton}>
                  <Plus size={26} color="#FFFFFF" strokeWidth={2.8} />
                </View>
              </TouchableOpacity>
            );
          }

          const IconComp = t.icon!;
          const isFocused = t.isFocused;

          const handleTabPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!isFocused && t.routeName) {
              navigation.navigate(t.routeName);
            }
          };

          const activeColor = isDark ? '#FFFFFF' : '#0F172A';
          const inactiveColor = isDark ? '#64748B' : '#64748B';

          return (
            <TouchableOpacity
              key={t.id}
              style={styles.normalTabContainer}
              onPress={handleTabPress}
              activeOpacity={0.75}
            >
              <IconComp
                size={22}
                color={isFocused ? activeColor : inactiveColor}
                strokeWidth={isFocused ? 2.4 : 1.8}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
                    fontWeight: isFocused ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockedContainer: {
    width: '100%',
    borderTopWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 58,
  },
  normalTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGreenButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: -0.2,
    marginTop: 2,
    textAlign: 'center',
  },
});
