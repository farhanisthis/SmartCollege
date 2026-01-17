import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth";
import { View } from "react-native";

export default function AppLayout() {
  const { user } = useAuth();
  
  // Safe guard: usually handled by root layout redirect
  if (!user) {
      return <View className="flex-1 bg-background" />;
  }

  return (
    <Tabs
        screenOptions={{
            headerShown: false,
            tabBarStyle: {
                backgroundColor: '#0a0a0a',
                borderTopColor: '#262626',
                height: 60,
                paddingBottom: 8,
                paddingTop: 8,
            },
            tabBarActiveTintColor: '#ffffff',
            tabBarInactiveTintColor: '#a3a3a3',
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500',
            },
        }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Updates",
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: "Performance",
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
