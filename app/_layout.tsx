import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Text, TextInput } from "react-native";

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
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
          headerTitleStyle: { fontFamily: "UrbanJungle", fontSize: 40 },
          headerTitleAlign: "center",
          contentStyle: { backgroundColor: theme.colors.bg }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="routes/[id]" options={{ title: "Ruta" }} />
        <Stack.Screen name="routes/[id]/edit" options={{ title: "Editar trazado" }} />
        <Stack.Screen name="routes/new" options={{ title: "Nueva ruta" }} />
      </Stack>
    </AuthProvider>
  );
}
