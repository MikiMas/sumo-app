import { Redirect } from "expo-router";
import { View } from "react-native";

import { ShimmerBlock } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function IndexScreen() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0b1118", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: "86%", gap: 10 }}>
          <ShimmerBlock height={22} width="48%" radius={10} />
          <ShimmerBlock height={50} radius={12} />
          <ShimmerBlock height={50} radius={12} />
        </View>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/routes" />;
}
