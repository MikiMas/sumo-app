import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { installNetworkLogger } from "@/lib/networkLogger";
import { AuthProvider } from "@/providers/AuthProvider";

installNetworkLogger();

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#111b25" },
          headerTintColor: "#f8fbff",
          contentStyle: { backgroundColor: "#0b1118" }
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
