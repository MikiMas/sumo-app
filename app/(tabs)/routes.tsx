import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, Region, UserLocationChangeEvent } from "react-native-maps";

import { AppButton, Card, MapShimmer, Screen } from "@/components/ui";
import { ensureForegroundLocationPermission, getCurrentPosition } from "@/lib/location";
import { useAuth } from "@/providers/AuthProvider";
import { GarageBike, fetchGarage } from "@/services/garage";
import { theme } from "@/lib/theme";
import { RouteItem, RoutePoint, checkInRoutePresence, fetchRoutePoints, fetchRoutePresence, fetchRoutes } from "@/services/routes";

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 40.4168, lng: -3.7038 };
const DEFAULT_REGION: Region = {
  latitude: DEFAULT_CENTER.lat,
  longitude: DEFAULT_CENTER.lng,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12
};
const EARTH_RADIUS_M = 6371000;
const AUTO_DETECT_RADIUS_M = 260;
const AUTO_DETECT_INTERVAL_MS = 12000;
const DECLINE_SNOOZE_MS = 20 * 60 * 1000;
const SUCCESS_SNOOZE_MS = 2 * 60 * 60 * 1000;

const MARKER_XL = require("../../assets/map/marker-framed-xl.png");
const CLEAN_MAP_STYLE = [
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] }
];

function isInRegion(route: RouteItem, region: Region) {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLng = region.longitude - region.longitudeDelta / 2;
  const maxLng = region.longitude + region.longitudeDelta / 2;

  return route.start_lat >= minLat && route.start_lat <= maxLat && route.start_lng >= minLng && route.start_lng <= maxLng;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const hav = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(hav)));
}

export default function RoutesScreen() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<RoutePoint[]>([]);
  const [presenceCount, setPresenceCount] = useState<number | null>(null);
  const [visibleRegion, setVisibleRegion] = useState<Region>(DEFAULT_REGION);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [nearbyPromptRoute, setNearbyPromptRoute] = useState<RouteItem | null>(null);
  const [confirmNearbyModalOpen, setConfirmNearbyModalOpen] = useState(false);
  const [bikePickerModalOpen, setBikePickerModalOpen] = useState(false);
  const [garageBikes, setGarageBikes] = useState<GarageBike[]>([]);
  const [loadingGarage, setLoadingGarage] = useState(false);
  const [checkingInNearby, setCheckingInNearby] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const lastDetectionAtRef = useRef(0);
  const promptSnoozeRef = useRef<Record<string, number>>({});
  const detectingRef = useRef(false);

  const visibleRoutes = useMemo(() => routes.filter((route) => isInRegion(route, visibleRegion)), [routes, visibleRegion]);
  const selectedRoutePolyline = useMemo(
    () =>
      selectedRoutePoints.map((point) => ({
        latitude: point.lat,
        longitude: point.lng
      })),
    [selectedRoutePoints]
  );

  const load = useCallback(async () => {
    try {
      const list = await fetchRoutes();
      setRoutes(list);
    } catch (error) {
      console.error("Error cargando spots:", error);
      Alert.alert("Error", "No se pudieron cargar los spots.");
    }
  }, []);

  const animateToRoute = useCallback((route: RouteItem) => {
    mapRef.current?.animateToRegion(
      {
        latitude: route.start_lat,
        longitude: route.start_lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      },
      300
    );
  }, []);

  const loadPresence = useCallback(async (routeId: string) => {
    setLoadingPresence(true);
    try {
      const presence = await fetchRoutePresence(routeId);
      setPresenceCount(presence.count);
    } catch {
      setPresenceCount(null);
    } finally {
      setLoadingPresence(false);
    }
  }, []);

  const onSelectRoute = useCallback(
    async (route: RouteItem) => {
      setSelectedRoute(route);
      animateToRoute(route);
      const points = await fetchRoutePoints(route.id).catch((error) => {
        console.error("Error cargando trazada del spot:", error);
        return [];
      });
      setSelectedRoutePoints(points);
      await loadPresence(route.id);
    },
    [animateToRoute, loadPresence]
  );

  const onClearSelection = useCallback(() => {
    setSelectedRoute(null);
    setSelectedRoutePoints([]);
    setPresenceCount(null);
  }, []);

  const onRefresh = useCallback(async () => {
    await load();
    if (selectedRoute) {
      const points = await fetchRoutePoints(selectedRoute.id).catch(() => []);
      setSelectedRoutePoints(points);
      await loadPresence(selectedRoute.id);
    }
  }, [load, loadPresence, selectedRoute]);

  const loadGarageBikes = useCallback(async () => {
    if (!user?.id) {
      setGarageBikes([]);
      return [];
    }

    setLoadingGarage(true);
    try {
      const bikes = await fetchGarage(user.id);
      setGarageBikes(bikes);
      return bikes;
    } catch (error) {
      Alert.alert("Error", `No se pudo cargar tu garaje: ${String(error)}`);
      return [];
    } finally {
      setLoadingGarage(false);
    }
  }, [user?.id]);

  const closeNearbyPrompt = useCallback(
    (routeId?: string, snoozeMs = DECLINE_SNOOZE_MS) => {
      if (routeId) {
        promptSnoozeRef.current[routeId] = Date.now() + snoozeMs;
      }
      setConfirmNearbyModalOpen(false);
      setBikePickerModalOpen(false);
      setNearbyPromptRoute(null);
      setSelectedBikeId(null);
    },
    []
  );

  const onConfirmNearby = useCallback(async () => {
    if (!nearbyPromptRoute) {
      return;
    }

    setConfirmNearbyModalOpen(false);
    const bikes = await loadGarageBikes();
    if (bikes.length > 0) {
      setSelectedBikeId(bikes[0]?.id ?? null);
    } else {
      setSelectedBikeId(null);
    }
    setBikePickerModalOpen(true);
  }, [loadGarageBikes, nearbyPromptRoute]);

  const onCheckInNearby = useCallback(async () => {
    if (!nearbyPromptRoute || checkingInNearby) {
      return;
    }

    setCheckingInNearby(true);
    try {
      await checkInRoutePresence(nearbyPromptRoute.id, selectedBikeId);
      promptSnoozeRef.current[nearbyPromptRoute.id] = Date.now() + SUCCESS_SNOOZE_MS;
      setBikePickerModalOpen(false);
      setNearbyPromptRoute(null);
      setSelectedBikeId(null);
      await loadPresence(nearbyPromptRoute.id);
      Alert.alert("Listo", "Te hemos marcado en este spot.");
    } catch (error) {
      Alert.alert("No se pudo marcar presencia", String(error));
    } finally {
      setCheckingInNearby(false);
    }
  }, [checkingInNearby, loadPresence, nearbyPromptRoute, selectedBikeId]);

  const detectNearbySpot = useCallback(
    async (lat: number, lng: number) => {
      if (!routes.length || confirmNearbyModalOpen || bikePickerModalOpen || checkingInNearby || !user?.id) {
        return;
      }

      let nearestRoute: RouteItem | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const route of routes) {
        const meters = distanceMeters(lat, lng, route.start_lat, route.start_lng);
        if (meters < nearestDistance) {
          nearestDistance = meters;
          nearestRoute = route;
        }
      }

      if (!nearestRoute || nearestDistance > AUTO_DETECT_RADIUS_M) {
        return;
      }

      const snoozeUntil = promptSnoozeRef.current[nearestRoute.id] ?? 0;
      if (Date.now() < snoozeUntil) {
        return;
      }

      try {
        const presence = await fetchRoutePresence(nearestRoute.id);
        const alreadyInSpot = (presence.members ?? []).some((member) => member.user_id === user.id);
        if (alreadyInSpot) {
          promptSnoozeRef.current[nearestRoute.id] = Date.now() + SUCCESS_SNOOZE_MS;
          return;
        }
      } catch {
        // keep silent here to avoid spamming alerts from passive detection
      }

      setNearbyPromptRoute(nearestRoute);
      setConfirmNearbyModalOpen(true);
      setSelectedBikeId(null);
    },
    [bikePickerModalOpen, checkingInNearby, confirmNearbyModalOpen, routes, user?.id]
  );

  const onUserLocationChange = useCallback(
    (event: UserLocationChangeEvent) => {
      const coords = event.nativeEvent.coordinate;
      if (!coords) {
        return;
      }

      const now = Date.now();
      if (now - lastDetectionAtRef.current < AUTO_DETECT_INTERVAL_MS) {
        return;
      }
      if (detectingRef.current) {
        return;
      }

      lastDetectionAtRef.current = now;
      detectingRef.current = true;
      void detectNearbySpot(coords.latitude, coords.longitude).finally(() => {
        detectingRef.current = false;
      });
    },
    [detectNearbySpot]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let mounted = true;

    const loadInitialLocation = async () => {
      try {
        const granted = await ensureForegroundLocationPermission();
        if (!granted) {
          return;
        }

        const coords = await getCurrentPosition();
        if (!mounted) {
          return;
        }

        const nextRegion: Region = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08
        };
        setVisibleRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 350);
      } catch {
        // fallback center
      }
    };

    loadInitialLocation();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.buttonContainer}>
          <AppButton label="Nuevo" onPress={() => router.push("/routes/new")} variant="secondary" />
        </View>
      </View>

      <Card style={styles.mapCard}>
        <MapView
          mapType="standard"
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          onRegionChangeComplete={setVisibleRegion}
          onUserLocationChange={onUserLocationChange}
          showsUserLocation
          showsMyLocationButton
          showsBuildings={false}
          showsIndoors={false}
          showsPointsOfInterest={false}
          showsTraffic={false}
          showsCompass={false}
          customMapStyle={CLEAN_MAP_STYLE}
          onMapReady={() => setMapReady(true)}
        >
          {selectedRoutePolyline.length > 1 ? (
            <Polyline
              coordinates={selectedRoutePolyline}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              geodesic
            />
          ) : null}

          {visibleRoutes.map((route) => (
            <Marker
              key={route.id}
              coordinate={{ latitude: route.start_lat, longitude: route.start_lng }}
              onPress={() => onSelectRoute(route)}
              anchor={{ x: 0.5, y: 1 }}
              image={MARKER_XL}
              tracksViewChanges={false}
            />
          ))}
        </MapView>

        {!mapReady ? (
          <View pointerEvents="none" style={styles.mapLoadingOverlay}>
            <MapShimmer height={320} />
          </View>
        ) : null}

        <View style={styles.topMapBar}>
          <Pressable onPress={onRefresh} style={styles.refreshIconBtn}>
            <Ionicons name="refresh" size={20} color="#111827" />
          </Pressable>
        </View>

        {selectedRoute ? (
          <View style={styles.overlay}>
            <Card style={styles.overlayCard}>
              <View style={styles.selectedOverlayHead}>
                <Text style={styles.overlayTitle}>{selectedRoute.title}</Text>
                <Pressable onPress={onClearSelection} style={styles.closeBtn}>
                  <Ionicons name="close" size={16} color="#111827" />
                </Pressable>
              </View>

              <View style={styles.presenceInline}>
                <Ionicons name="person" size={15} color="#111827" />
                <Text style={styles.presenceCount}>{loadingPresence ? "..." : presenceCount != null ? String(presenceCount) : "--"}</Text>
              </View>

              <Pressable onPress={() => router.push(`/routes/${selectedRoute.id}`)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Ver spot</Text>
              </Pressable>
            </Card>
          </View>
        ) : null}
      </Card>

      <Modal visible={confirmNearbyModalOpen} transparent animationType="fade" onRequestClose={() => closeNearbyPrompt(nearbyPromptRoute?.id)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Estas en este spot?</Text>
              <Pressable onPress={() => closeNearbyPrompt(nearbyPromptRoute?.id)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={16} color="#111827" />
              </Pressable>
            </View>

            <Text style={styles.modalRouteName}>{nearbyPromptRoute?.title ?? "Spot"}</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalActionLight}
                onPress={() => closeNearbyPrompt(nearbyPromptRoute?.id)}
                accessibilityRole="button"
                accessibilityLabel="No"
              >
                <Text style={styles.modalActionLightText}>No</Text>
              </Pressable>
              <Pressable
                style={styles.modalActionDark}
                onPress={onConfirmNearby}
                accessibilityRole="button"
                accessibilityLabel="Si"
              >
                <Text style={styles.modalActionDarkText}>Si</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>

      <Modal visible={bikePickerModalOpen} transparent animationType="slide" onRequestClose={() => closeNearbyPrompt(nearbyPromptRoute?.id)}>
        <View style={styles.modalBackdropBottom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeNearbyPrompt(nearbyPromptRoute?.id)} />
          <Card style={styles.modalCardBottom}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Con que moto estas?</Text>
              <Pressable onPress={() => closeNearbyPrompt(nearbyPromptRoute?.id)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={16} color="#111827" />
              </Pressable>
            </View>

            {loadingGarage ? (
              <Text style={styles.modalHint}>Cargando garaje...</Text>
            ) : (
              <ScrollView style={styles.bikePickerList} contentContainerStyle={styles.bikePickerContent}>
                <Pressable
                  style={[styles.bikeOption, selectedBikeId == null && styles.bikeOptionActive]}
                  onPress={() => setSelectedBikeId(null)}
                >
                  <View style={styles.bikeOptionImageFallback}>
                    <Ionicons name="walk-outline" size={18} color="#111827" />
                  </View>
                  <View style={styles.bikeOptionMeta}>
                    <Text style={styles.bikeOptionTitle}>Sin moto</Text>
                  </View>
                  {selectedBikeId == null ? <Ionicons name="checkmark" size={16} color="#111827" /> : null}
                </Pressable>

                {garageBikes.map((bike) => (
                  <Pressable
                    key={bike.id}
                    style={[styles.bikeOption, selectedBikeId === bike.id && styles.bikeOptionActive]}
                    onPress={() => setSelectedBikeId(bike.id)}
                  >
                    {bike.photo_url ? (
                      <Image source={{ uri: bike.photo_url }} style={styles.bikeOptionImage} />
                    ) : (
                      <View style={styles.bikeOptionImageFallback}>
                        <Ionicons name="bicycle-outline" size={18} color="#111827" />
                      </View>
                    )}
                    <View style={styles.bikeOptionMeta}>
                      <Text style={styles.bikeOptionTitle}>
                        {bike.brand} {bike.model}
                      </Text>
                      <Text style={styles.bikeOptionSub}>{bike.year ? String(bike.year) : "Anio -"}</Text>
                    </View>
                    {selectedBikeId === bike.id ? <Ionicons name="checkmark" size={16} color="#111827" /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalActionLight}
                onPress={() => closeNearbyPrompt(nearbyPromptRoute?.id)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Ionicons name="close" size={18} color="#111827" />
              </Pressable>
              <Pressable
                style={[styles.modalActionDark, checkingInNearby && styles.modalActionDisabled]}
                onPress={onCheckInNearby}
                disabled={checkingInNearby}
                accessibilityRole="button"
                accessibilityLabel="Confirmar moto"
              >
                <Ionicons name={checkingInNearby ? "hourglass-outline" : "checkmark"} size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 10
  },
  buttonContainer: {
    width: "100%"
  },
  mapCard: {
    padding: 0,
    overflow: "hidden",
    height: "88%"
  },
  map: {
    width: "100%",
    height: "100%"
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 10
  },
  topMapBar: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  refreshIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E8EE",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7A8594",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  overlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 90
  },
  overlayCard: {
    gap: 10
  },
  selectedOverlayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  overlayTitle: {
    color: "#111827",
    fontSize: 18,
    flex: 1
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center"
  },
  presenceInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  presenceCount: {
    color: "#111827",
    fontSize: 16
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.32)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  modalBackdropBottom: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17,24,39,0.32)",
    paddingHorizontal: 14,
    paddingBottom: 14
  },
  modalCard: {
    width: "100%",
    gap: 12
  },
  modalCardBottom: {
    width: "100%",
    maxHeight: "72%",
    gap: 10
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalTitle: {
    color: "#111827",
    fontSize: 19
  },
  modalRouteName: {
    color: "#111827",
    fontSize: 15
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center"
  },
  modalHint: {
    color: "#6B7280",
    fontSize: 13
  },
  bikePickerList: {
    maxHeight: 320
  },
  bikePickerContent: {
    gap: 8,
    paddingBottom: 4
  },
  bikeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  bikeOptionActive: {
    borderColor: "#111827",
    backgroundColor: "#F3F4F6"
  },
  bikeOptionImage: {
    width: 66,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6"
  },
  bikeOptionImageFallback: {
    width: 66,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center"
  },
  bikeOptionMeta: {
    flex: 1,
    gap: 2
  },
  bikeOptionTitle: {
    color: "#111827",
    fontSize: 15
  },
  bikeOptionSub: {
    color: "#6B7280",
    fontSize: 12
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8
  },
  modalActionLight: {
    minHeight: 38,
    minWidth: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  modalActionDark: {
    minHeight: 38,
    minWidth: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  modalActionLightText: {
    color: "#111827",
    fontSize: 13
  },
  modalActionDarkText: {
    color: "#FFFFFF",
    fontSize: 13
  },
  modalActionDisabled: {
    opacity: 0.55
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  actionBtnText: {
    color: theme.colors.white,
    fontSize: 12
  }
});
