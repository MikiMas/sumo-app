import { Redirect, Tabs, router } from "expo-router";
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
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.white,
        headerTitle: ({ children }) => <HeaderTitleFit>{children}</HeaderTitleFit>,
        headerTitleStyle: { fontFamily: "UrbanJungle", fontSize: 40 },
        headerTitleContainerStyle: { paddingTop: 10 },
        headerTitleAlign: "center",
        tabBarStyle: { display: "none" },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerLeft:
          route.name === "routes"
            ? undefined
            : () => (
                <Pressable
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                      return;
                    }
                    router.replace("/(tabs)/routes");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 2,
                    paddingVertical: 2
                  }}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </Pressable>
              )
      })}
    >
      <Tabs.Screen
        name="routes"
        options={{
          title: "Spots",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel="Ir al perfil"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#2A2A2A",
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8
              }}
            >
              <Ionicons name="person" size={18} color="#0B0B0B" />
            </Pressable>
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Spots" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "map" : "map-outline"} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "Garaje",
          href: null,
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
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>
  );
}
