import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useColors } from '@/constants/theme';

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Files',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'About',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
