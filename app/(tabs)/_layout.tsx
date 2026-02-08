import { Redirect, Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ShimmerBlock } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/lib/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? theme.colors.primary : theme.colors.textSecondary, fontSize: 12, fontFamily: "BebasNeue" }}>
      {label}
    </Text>
  );
}

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>["name"]; focused: boolean }) {
  return <Ionicons name={name} size={20} color={focused ? theme.colors.primary : theme.colors.textSecondary} />;
}

function HeaderTitleFit({ children }: { children: string }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.65}
      style={{ color: "#FFFFFF", fontFamily: "UrbanJungle", fontSize: 40, paddingHorizontal: 12 }}
    >
      {children}
    </Text>
  );
}

function PlusTabButton({ onPress, focused }: { onPress?: (...args: any[]) => void; focused: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.colors.primary
        }}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <View style={{ width: "86%", gap: 12 }}>
          <ShimmerBlock height={28} width="42%" radius={12} />
          <ShimmerBlock height={120} radius={16} />
          <ShimmerBlock height={120} radius={16} />
        </View>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.white,
        headerTitle: ({ children }) => <HeaderTitleFit>{children}</HeaderTitleFit>,
        headerTitleStyle: { fontFamily: "UrbanJungle", fontSize: 40 },
        headerTitleContainerStyle: { paddingTop: 10 },
        headerTitleAlign: "center",
        tabBarStyle: {
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 16,
          borderTopWidth: 0,
          backgroundColor: "#FFFFFF",
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 24,
          overflow: "visible",
          shadowColor: "#6B7280",
          shadowOpacity: 0.2,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarLabel: ({ focused }) => <TabLabel label="Inicio" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: "Rutas",
          tabBarLabel: ({ focused }) => <TabLabel label="Rutas" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "map" : "map-outline"} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Publicar",
          headerTitle: "Publicar",
          headerTitleStyle: { fontFamily: "UrbanJungle", fontSize: 30 },
          tabBarLabel: () => null,
          tabBarButton: ({ onPress, accessibilityState }) => <PlusTabButton onPress={onPress} focused={Boolean(accessibilityState?.selected)} />
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "Garaje",
          tabBarLabel: ({ focused }) => <TabLabel label="Garaje" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "construct" : "construct-outline"} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: ({ focused }) => <TabLabel label="Perfil" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "person" : "person-outline"} focused={focused} />
        }}
      />
    </Tabs>
  );
}
