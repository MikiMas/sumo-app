import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { AppButton, Card, LabeledInput, MapShimmer, Screen, ShimmerBlock, ShimmerCard } from "@/components/ui";
import {
  RouteItem,
  RoutePlan,
  RoutePoint,
  SpotPresenceMember,
  addRouteMedia,
  addRoutePlan,
  fetchRouteById,
  fetchRouteMedia,
  fetchRoutePlans,
  fetchRoutePoints,
  fetchRoutePresence
} from "@/services/routes";
import { useAuth } from "@/providers/AuthProvider";
import { uploadImageFromUriRaw } from "@/services/media";

export default function RouteDetailScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [plans, setPlans] = useState<RoutePlan[]>([]);
  const [presenceMembers, setPresenceMembers] = useState<SpotPresenceMember[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newPlanAt, setNewPlanAt] = useState("");
  const [newPlanNote, setNewPlanNote] = useState("");
  const [savingMedia, setSavingMedia] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const loadRouteData = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    try {
      const [routeData, pointsData, mediaData, plansData, presenceData] = await Promise.all([
        fetchRouteById(routeId),
        fetchRoutePoints(routeId),
        fetchRouteMedia(routeId),
        fetchRoutePlans(routeId),
        fetchRoutePresence(routeId)
      ]);
      setRoute(routeData);
      setRoutePoints(pointsData);
      setMedia(mediaData);
      setPlans(plansData);
      setPresenceCount(presenceData.count);
      setPresenceMembers(presenceData.members ?? []);
    } catch (error) {
      Alert.alert("Error cargando ruta", String(error));
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    setMapReady(false);
    loadRouteData();
  }, [loadRouteData]);

  const onAddMedia = async () => {
    if (!routeId || !newMediaUrl.trim()) return;
    setSavingMedia(true);
    try {
      await addRouteMedia(routeId, newMediaUrl.trim(), null);
      setNewMediaUrl("");
      await loadRouteData();
    } catch (error) {
      Alert.alert("No se pudo anadir foto", String(error));
    } finally {
      setSavingMedia(false);
    }
  };

  const onPickRouteMedia = async () => {
    if (!routeId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas dar permiso para abrir la galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    if (!session?.accessToken) {
      Alert.alert("Sesion", "Inicia sesion de nuevo para subir imagen.");
      return;
    }
    try {
      const url = await uploadImageFromUriRaw(result.assets[0].uri, "route-media", session.accessToken);
      setNewMediaUrl(url);
    } catch (error) {
      Alert.alert("No se pudo subir imagen", String(error));
    }
  };

  const onAddPlan = async () => {
    if (!routeId || !newPlanAt.trim()) return;
    setSavingPlan(true);
    try {
      await addRoutePlan(routeId, newPlanAt.trim(), newPlanNote.trim() || null);
      setNewPlanAt("");
      setNewPlanNote("");
      await loadRouteData();
    } catch (error) {
      Alert.alert("No se pudo crear plan", String(error));
    } finally {
      setSavingPlan(false);
    }
  };

  const upcomingPlans = useMemo(() => plans.slice(0, 20), [plans]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {loading || !route ? (
          <>
            <ShimmerCard />
            <Card style={styles.blockCard}>
              <ShimmerBlock height={18} width="40%" />
              <ShimmerBlock height={250} radius={12} />
            </Card>
            <ShimmerCard lines={5} />
            <ShimmerCard lines={4} />
          </>
        ) : (
          <>
            <Card style={styles.routeCard}>
              <Text style={styles.routeTitle}>{route.title}</Text>
              <Text style={styles.routeMeta}>{route.distance_km ?? "-"} km</Text>
              <Text style={styles.routeDescription}>{route.description ?? "Sin descripcion."}</Text>
              <Text style={styles.routeBy}>por @{route.profiles?.username ?? "rider"}</Text>
            </Card>

            <Card style={styles.mapCard}>
              <Text style={styles.mapTitle}>Mapa de la ruta</Text>
              <View style={styles.mapWrap}>
                <MapView
                  mapType="standard"
                  style={styles.map}
                  initialRegion={{
                    latitude: route.start_lat,
                    longitude: route.start_lng,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06
                  }}
                  onMapReady={() => setMapReady(true)}
                >
                  <Marker coordinate={{ latitude: route.start_lat, longitude: route.start_lng }} title="Inicio de ruta" pinColor="#ff6d00" />
                  {routePoints.length > 1 ? (
                    <Polyline
                      coordinates={routePoints.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
                      strokeColor="#ff9e54"
                      strokeWidth={4}
                    />
                  ) : null}
                </MapView>
                {!mapReady ? (
                  <View pointerEvents="none" style={styles.mapLoadingOverlay}>
                    <MapShimmer height={260} />
                  </View>
                ) : null}
              </View>
            </Card>

            <Card style={styles.blockCard}>
              <Text style={styles.blockTitle}>Fotos de la ruta</Text>
              <View style={styles.mediaGrid}>
                {media.length === 0 ? (
                  <Text style={styles.itemText}>Aun no hay fotos.</Text>
                ) : (
                  media.slice(0, 12).map((item) => <Image key={item.id} source={{ uri: item.media_url }} style={styles.mediaItem} />)
                )}
              </View>
              <LabeledInput label="URL nueva foto" value={newMediaUrl} onChangeText={setNewMediaUrl} />
              <AppButton label="Elegir foto de galeria" variant="secondary" onPress={onPickRouteMedia} />
              <Text style={styles.helper}>La imagen se sube a Storage y luego se guarda en la ruta.</Text>
              <AppButton label="Anadir foto" onPress={onAddMedia} loading={savingMedia} />
            </Card>

            <Card style={styles.blockCard}>
              <Text style={styles.blockTitle}>Gente ahora en la ruta ({presenceCount})</Text>
              {presenceMembers.length === 0 ? (
                <Text style={styles.itemText}>Nadie conectado ahora.</Text>
              ) : (
                presenceMembers.map((member) => (
                  <Pressable key={`${member.user_id}-${member.checked_in_at}`} style={styles.personRow}>
                    <View style={styles.avatarDot} />
                    <Text style={styles.itemText}>
                      @{member.username ?? "rider"} · {member.bike_brand ?? "-"} {member.bike_model ?? ""}
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>

            <Card style={styles.blockCard}>
              <Text style={styles.blockTitle}>Van a estar en la ruta</Text>
              {upcomingPlans.length === 0 ? (
                <Text style={styles.itemText}>Sin planes publicados.</Text>
              ) : (
                upcomingPlans.map((plan) => (
                  <Pressable key={plan.id} style={styles.personRow}>
                    <View style={styles.planDot} />
                    <Text style={styles.itemText}>
                      @{plan.profiles?.username ?? "rider"} · {new Date(plan.planned_at).toLocaleString()}
                      {plan.note ? ` · ${plan.note}` : ""}
                    </Text>
                  </Pressable>
                ))
              )}
              <LabeledInput label="Voy a estar (ISO, ej: 2026-02-07T16:00:00Z)" value={newPlanAt} onChangeText={setNewPlanAt} />
              <LabeledInput label="Nota (opcional)" value={newPlanNote} onChangeText={setNewPlanNote} />
              <AppButton label="Publicar plan" onPress={onAddPlan} loading={savingPlan} />
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
    color: "#111827",
    fontWeight: "700"
  },
  routeCard: {
    gap: 7
  },
  routeTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 24
  },
  routeMeta: {
    color: "#6B7280"
  },
  routeDescription: {
    color: "#4B5563",
    lineHeight: 20
  },
  routeBy: {
    color: "#6B7280",
    fontSize: 12
  },
  mapCard: {
    gap: 8
  },
  mapTitle: {
    color: "#111827",
    fontWeight: "800"
  },
  map: {
    width: "100%",
    height: 260,
    borderRadius: 12
  },
  mapWrap: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    overflow: "hidden"
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  blockCard: {
    gap: 8
  },
  blockTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 16
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  mediaItem: {
    width: 90,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2f4761",
    backgroundColor: "#0a1016"
  },
  itemText: {
    color: "#4B5563"
  },
  helper: {
    color: "#6B7280",
    fontSize: 12
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  avatarDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#2a9d8f"
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ff9e54"
  }
});
