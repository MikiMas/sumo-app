import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "@/providers/AuthProvider";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ color: focused ? "#ff9e54" : "#92a7bf", fontSize: 12 }}>{label}</Text>;
}

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b1118" }}>
        <ActivityIndicator color="#ff6d00" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#111b25" },
        headerTintColor: "#f8fbff",
        tabBarStyle: { backgroundColor: "#0f1722", borderTopColor: "#243244" }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarLabel: ({ focused }) => <TabLabel label="Inicio" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: "Rutas",
          tabBarLabel: ({ focused }) => <TabLabel label="Rutas" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "Garaje",
          tabBarLabel: ({ focused }) => <TabLabel label="Garaje" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: ({ focused }) => <TabLabel label="Perfil" focused={focused} />
        }}
      />
    </Tabs>
  );
}
