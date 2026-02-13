import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Pressable, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { installNetworkLogger } from "@/lib/networkLogger";
import { AuthProvider } from "@/providers/AuthProvider";
import { theme } from "@/lib/theme";

installNetworkLogger();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    UrbanJungle: require("../assets/fonts/UrbanJungleDEMO.otf"),
    BebasNeue: require("../assets/fonts/BebasNeue-Regular.otf")
  });

  if (!fontsLoaded) {
    return null;
  }

  const AnyText = Text as any;
  AnyText.defaultProps = AnyText.defaultProps || {};
  AnyText.defaultProps.style = [{ fontFamily: "BebasNeue" }, AnyText.defaultProps.style];

  const AnyTextInput = TextInput as any;
  AnyTextInput.defaultProps = AnyTextInput.defaultProps || {};
  AnyTextInput.defaultProps.style = [{ fontFamily: "BebasNeue" }, AnyTextInput.defaultProps.style];

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={({ navigation }) => ({
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
          headerTitleStyle: { fontFamily: "UrbanJungle", fontSize: 40 },
          headerTitleAlign: "center",
          contentStyle: { backgroundColor: theme.colors.bg },
          headerBackVisible: false,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <Pressable
                onPress={() => navigation.goBack()}
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
            ) : null
        })}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="garage/[id]" options={{ title: "Vehiculo" }} />
        <Stack.Screen name="routes/[id]" options={{ title: "Spot" }} />
        <Stack.Screen name="routes/[id]/edit" options={{ title: "Editar spot" }} />
        <Stack.Screen name="routes/new" options={{ title: "Nuevo spot" }} />
      </Stack>
    </AuthProvider>
  );
}
