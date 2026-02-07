import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, Screen } from "@/components/ui";
import { RouteItem, fetchRoutes } from "@/services/routes";

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchRoutes();
      setRoutes(list);
    } catch (error) {
      console.error("Error cargando rutas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Rutas</Text>
        <AppButton label="Nueva" onPress={() => router.push("/routes/new")} variant="secondary" />
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl tintColor="#ff6d00" refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>{loading ? "Cargando..." : "Sin rutas aun"}</Text>
            <Text style={styles.emptyText}>Crea la primera ruta para tu zona y empieza a rodar.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/routes/${item.id}`)} style={styles.routePressable}>
            <Card>
              <View style={styles.routeHeader}>
                <Text style={styles.routeTitle}>{item.title}</Text>
                <Text style={styles.badge}>{item.difficulty.toUpperCase()}</Text>
              </View>
              <Text style={styles.routeMeta}>
                {item.city ?? "Ciudad no definida"} · {item.distance_km ?? "-"} km · {item.estimated_minutes ?? "-"} min
              </Text>
              <Text style={styles.routeBy}>por @{item.profiles?.username ?? "rider"}</Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  title: {
    color: "#f8fbff",
    fontSize: 24,
    fontWeight: "900"
  },
  list: {
    gap: 10,
    paddingBottom: 24
  },
  routePressable: {
    borderRadius: 12
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  routeTitle: {
    color: "#f8fbff",
    fontWeight: "800",
    fontSize: 17,
    flex: 1,
    marginRight: 10
  },
  badge: {
    color: "#101418",
    backgroundColor: "#ff9e54",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: "900",
    overflow: "hidden",
    fontSize: 11
  },
  routeMeta: {
    color: "#b4c8de",
    marginTop: 8
  },
  routeBy: {
    color: "#8ca5c0",
    marginTop: 8,
    fontSize: 12
  },
  emptyTitle: {
    color: "#f8fbff",
    fontWeight: "800",
    fontSize: 18
  },
  emptyText: {
    color: "#9eb4cd",
    marginTop: 6
  }
});
