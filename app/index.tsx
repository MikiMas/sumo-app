import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/providers/AuthProvider";

export default function IndexScreen() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0b1118", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#ff6d00" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
