import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { AppButton, Card, Screen } from "@/components/ui";
import { env } from "@/lib/env";
import { ensureForegroundLocationPermission, getCurrentPosition } from "@/lib/location";
import { timeAgo } from "@/lib/time";
import { useAuth } from "@/providers/AuthProvider";
import {
  ActiveRider,
  RouteItem,
  RoutePoint,
  fetchActiveRiders,
  fetchMyActiveSession,
  fetchRouteById,
  fetchRoutePoints,
  isNearRouteStart,
  sendLocationTick,
  startRouteSession,
  stopRouteSession
} from "@/services/routes";
import { Database } from "@/types/db";

type RouteSession = Database["public"]["Tables"]["route_sessions"]["Row"];

export default function RouteDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, profile } = useAuth();
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [activeSession, setActiveSession] = useState<RouteSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [shareLocation, setShareLocation] = useState(profile?.default_share_live_location ?? true);
  const [tickError, setTickError] = useState<string | null>(null);

  useEffect(() => {
    setShareLocation(profile?.default_share_live_location ?? true);
  }, [profile?.default_share_live_location]);

  const loadRouteData = useCallback(async () => {
    if (!routeId || !user) {
      return;
    }

    setLoading(true);
    try {
      const [routeData, ridersData, mySession, pointsData] = await Promise.all([
        fetchRouteById(routeId),
        fetchActiveRiders(routeId),
        fetchMyActiveSession(routeId, user.id),
        fetchRoutePoints(routeId)
      ]);
      setRoute(routeData);
      setRiders(ridersData);
      setActiveSession(mySession);
      setRoutePoints(pointsData);
    } catch (error) {
      Alert.alert("Error cargando ruta", String(error));
    } finally {
      setLoading(false);
    }
  }, [routeId, user]);

  useEffect(() => {
    loadRouteData();
  }, [loadRouteData]);

  useEffect(() => {
    if (!routeId) {
      return;
    }

    const interval = setInterval(() => {`r`n      fetchActiveRiders(routeId)`r`n        .then(setRiders)`r`n        .catch((error) => console.error("Error refrescando riders:", error));`r`n    }, 5000);`r`n`r`n    return () => {`r`n      clearInterval(interval);`r`n    };`r`n  }, [routeId]);

  const sendTick = useCallback(async () => {
    if (!activeSession) {
      return;
    }

    try {
      const coords = await getCurrentPosition();
      await sendLocationTick({`r`n        routeId: route.id,
        lat: coords.latitude,
        lng: coords.longitude,
        speedMps: coords.speed,
        headingDeg: coords.heading,
        accuracyM: coords.accuracy
      });
      setTickError(null);
    } catch (error) {
      const message = String(error);
      setTickError(message);
      console.error("Error enviando ubicacion:", error);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    sendTick();
    const interval = setInterval(sendTick, env.trackingIntervalMs);

    return () => clearInterval(interval);
  }, [activeSession, sendTick]);

  const onStartRoute = async () => {
    if (!route || !user || savingSession) {
      return;
    }

    setSavingSession(true);
    try {
      const granted = await ensureForegroundLocationPermission();
      if (!granted) {
        Alert.alert("Permiso de GPS obligatorio", "Necesitas permitir ubicacion para iniciar ruta.");
        return;
      }

      const coords = await getCurrentPosition();
      const nearStart = await isNearRouteStart(route.id, coords.latitude, coords.longitude, 500);

      if (!nearStart) {
        Alert.alert("Aviso", "No pareces estar cerca del inicio de la ruta, pero puedes iniciar igualmente.");
      }

      const session = await startRouteSession(route.id, user.id, shareLocation);
      setActiveSession(session);
      await sendLocationTick({`r`n        routeId: route.id,
        lat: coords.latitude,
        lng: coords.longitude,
        speedMps: coords.speed,
        headingDeg: coords.heading,
        accuracyM: coords.accuracy
      });
      const updated = await fetchActiveRiders(route.id);
      setRiders(updated);
      Alert.alert("Ruta iniciada", `Tracking activo cada ${Math.round(env.trackingIntervalMs / 1000)} segundos.`);
    } catch (error) {
      Alert.alert("No se pudo iniciar ruta", String(error));
    } finally {
      setSavingSession(false);
    }
  };

  const onStopRoute = async () => {
    if (!activeSession || savingSession) {
      return;
    }

    setSavingSession(true);
    try {
      await stopRouteSession(route.id, activeSession.id);
      setActiveSession(null);
      if (routeId) {
        const updated = await fetchActiveRiders(routeId);
        setRiders(updated);
      }
      Alert.alert("Ruta detenida", "Has dejado de compartir posicion.");
    } catch (error) {
      Alert.alert("No se pudo detener la ruta", String(error));
    } finally {
      setSavingSession(false);
    }
  };

  const mapRiders = useMemo(() => riders.filter((item) => item.last_lat != null && item.last_lng != null), [riders]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {loading || !route ? (
          <Card>
            <Text style={styles.loadingText}>Cargando ruta...</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.routeCard}>
              <Text style={styles.routeTitle}>{route.title}</Text>
              <Text style={styles.routeMeta}>
                {route.city ?? "Ciudad no definida"} - {route.distance_km ?? "-"} km - {route.estimated_minutes ?? "-"} min
              </Text>
              <Text style={styles.routeDescription}>{route.description ?? "Sin descripcion."}</Text>
              <Text style={styles.routeBy}>por @{route.profiles?.username ?? "rider"}</Text>
              <AppButton label="Editar trazado" variant="secondary" onPress={() => router.push(`/routes/${route.id}/edit`)} />
            </Card>

            <Card style={styles.switchCard}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Compartir mi ubicacion cuando inicie ruta</Text>
                <Switch value={shareLocation} onValueChange={setShareLocation} disabled={Boolean(activeSession)} />
              </View>

              {!activeSession ? (
                <AppButton label="Iniciar ruta" onPress={onStartRoute} loading={savingSession} />
              ) : (
                <AppButton label="Detener ruta" variant="danger" onPress={onStopRoute} loading={savingSession} />
              )}

              {tickError ? <Text style={styles.tickError}>Ultimo error de tracking: {tickError}</Text> : null}
            </Card>

            <Card style={styles.mapCard}>
              <Text style={styles.mapTitle}>Mapa en tiempo real</Text>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: route.start_lat,
                  longitude: route.start_lng,
                  latitudeDelta: 0.06,
                  longitudeDelta: 0.06
                }}
              >
                <Marker
                  coordinate={{ latitude: route.start_lat, longitude: route.start_lng }}
                  title="Inicio de ruta"
                  pinColor="#ff6d00"
                />
                {mapRiders.map((rider) => (
                  <Marker
                    key={rider.id}
                    coordinate={{ latitude: rider.last_lat as number, longitude: rider.last_lng as number }}
                    title={rider.profiles?.username ?? "rider"}
                    description={timeAgo(rider.last_seen_at)}
                    pinColor={rider.user_id === user?.id ? "#2a9d8f" : "#3a86ff"}
                  />
                ))}
                {routePoints.length > 1 ? (
                  <Polyline
                    coordinates={routePoints.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
                    strokeColor="#ff9e54"
                    strokeWidth={4}
                  />
                ) : null}
              </MapView>
            </Card>

            <Card style={styles.ridersCard}>
              <Text style={styles.ridersTitle}>Riders activos ({mapRiders.length})</Text>
              {mapRiders.length === 0 ? (
                <Text style={styles.riderItem}>Aun no hay nadie en directo.</Text>
              ) : (
                mapRiders.map((rider) => (
                  <Text key={rider.id} style={styles.riderItem}>
                    @{rider.profiles?.username ?? "rider"} - {timeAgo(rider.last_seen_at)}
                  </Text>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 26
  },
  loadingText: {
    color: "#f8fbff",
    fontWeight: "700"
  },
  routeCard: {
    gap: 7
  },
  routeTitle: {
    color: "#f8fbff",
    fontWeight: "900",
    fontSize: 24
  },
  routeMeta: {
    color: "#b4c8de"
  },
  routeDescription: {
    color: "#c5d7ea",
    lineHeight: 20
  },
  routeBy: {
    color: "#8da7c2",
    fontSize: 12
  },
  switchCard: {
    gap: 10
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  switchLabel: {
    color: "#c5d7ea",
    flex: 1
  },
  tickError: {
    color: "#ffb4a2",
    fontSize: 12
  },
  mapCard: {
    gap: 8
  },
  mapTitle: {
    color: "#f8fbff",
    fontWeight: "800"
  },
  map: {
    width: "100%",
    height: 280,
    borderRadius: 12
  },
  ridersCard: {
    gap: 8
  },
  ridersTitle: {
    color: "#f8fbff",
    fontWeight: "800"
  },
  riderItem: {
    color: "#c5d7ea"
  }
});

