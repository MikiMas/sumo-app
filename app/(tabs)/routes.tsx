import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";

import { AppButton, Card, MapShimmer, Screen } from "@/components/ui";
import { ensureForegroundLocationPermission, getCurrentPosition } from "@/lib/location";
import { theme } from "@/lib/theme";
import {
  RouteItem,
  RoutePoint,
  SpotPresenceMember,
  checkInRoutePresence,
  fetchRoutePoints,
  fetchRoutePresence,
  fetchRoutes
} from "@/services/routes";

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 40.4168, lng: -3.7038 };
const DEFAULT_REGION: Region = {
  latitude: DEFAULT_CENTER.lat,
  longitude: DEFAULT_CENTER.lng,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12
};

const SUGGEST_RADIUS_METERS = 180;
const MAX_ROUTE_LAT_DELTA = 0.2;
const MAX_PRESENCE_PREFETCH = 18;
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

function distanceMeters(a: LatLng, b: LatLng) {
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function toMapCoordinate(point: { lat: unknown; lng: unknown }) {
  return {
    latitude: Number(point.lat),
    longitude: Number(point.lng)
  };
}

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<RoutePoint[]>([]);
  const [presenceCount, setPresenceCount] = useState<number | null>(null);
  const [presenceMembers, setPresenceMembers] = useState<SpotPresenceMember[]>([]);
  const [routePresenceCounts, setRoutePresenceCounts] = useState<Record<string, number>>({});
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [visibleRegion, setVisibleRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(false);
  const [loadingRoutePath, setLoadingRoutePath] = useState(false);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const promptedRouteRef = useRef<string | null>(null);

  const canRenderRoutes = visibleRegion.latitudeDelta <= MAX_ROUTE_LAT_DELTA;

  const visibleRoutes = useMemo(() => {
    if (!canRenderRoutes) {
      return [];
    }
    return routes.filter((route) => isInRegion(route, visibleRegion));
  }, [canRenderRoutes, routes, visibleRegion]);

  const visibleRidersTotal = useMemo(
    () => visibleRoutes.reduce((acc, route) => acc + (routePresenceCounts[route.id] ?? 0), 0),
    [routePresenceCounts, visibleRoutes]
  );

  const missingVisiblePresenceIds = useMemo(() => {
    if (!canRenderRoutes) {
      return [] as string[];
    }

    return visibleRoutes
      .map((route) => route.id)
      .filter((id) => routePresenceCounts[id] == null)
      .slice(0, MAX_PRESENCE_PREFETCH);
  }, [canRenderRoutes, routePresenceCounts, visibleRoutes]);

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

  const animateToRoute = useCallback((route: RouteItem) => {
    mapRef.current?.animateToRegion(
      {
        latitude: route.start_lat,
        longitude: route.start_lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      },
      350
    );
  }, []);

  const loadPresence = useCallback(async (routeId: string) => {
    setLoadingPresence(true);
    try {
      const presence = await fetchRoutePresence(routeId);
      setPresenceCount(presence.count);
      setPresenceMembers(presence.members ?? []);
      setRoutePresenceCounts((current) => ({ ...current, [routeId]: presence.count }));
    } catch {
      setPresenceCount(null);
      setPresenceMembers([]);
    } finally {
      setLoadingPresence(false);
    }
  }, []);

  const onSelectRoute = useCallback(
    async (route: RouteItem) => {
      setSelectedRoute(route);
      setLoadingRoutePath(true);
      animateToRoute(route);

      try {
        const points = await fetchRoutePoints(route.id);
        setSelectedRoutePoints(points);
        if (points.length > 1) {
          const coords = points.map(toMapCoordinate).filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
          if (coords.length > 1) {
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 90, right: 70, bottom: 180, left: 70 },
              animated: true
            });
          }
        }
      } catch (error) {
        console.error("Error cargando trazado de ruta:", error);
        setSelectedRoutePoints([]);
      } finally {
        setLoadingRoutePath(false);
      }

      await loadPresence(route.id);
    },
    [animateToRoute, loadPresence]
  );

  const onCheckIn = useCallback(async () => {
    if (!selectedRoute || checkingIn) {
      return;
    }

    setCheckingIn(true);
    try {
      await checkInRoutePresence(selectedRoute.id, null);
      await loadPresence(selectedRoute.id);
      Alert.alert("Marcado", "Ya apareces en este spot.");
    } catch (error) {
      Alert.alert("No se pudo marcar presencia", String(error));
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, loadPresence, selectedRoute]);

  const onClearSelection = useCallback(() => {
    setSelectedRoute(null);
    setSelectedRoutePoints([]);
    setPresenceCount(null);
    setPresenceMembers([]);
  }, []);

  const onRefresh = useCallback(async () => {
    await load();
    if (selectedRoute) {
      await loadPresence(selectedRoute.id);
    }
  }, [load, loadPresence, selectedRoute]);

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

        const nextCenter = { lat: coords.latitude, lng: coords.longitude };
        setMapCenter(nextCenter);
        const nextRegion: Region = {
          latitude: nextCenter.lat,
          longitude: nextCenter.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08
        };
        setVisibleRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 400);
      } catch {
        // fallback center
      }
    };

    loadInitialLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!missingVisiblePresenceIds.length) {
      return;
    }

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        missingVisiblePresenceIds.map(async (routeId) => {
          try {
            const presence = await fetchRoutePresence(routeId);
            return [routeId, presence.count] as const;
          } catch {
            return [routeId, 0] as const;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setRoutePresenceCounts((current) => {
        const next = { ...current };
        for (const [routeId, count] of entries) {
          next[routeId] = count;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [missingVisiblePresenceIds]);

  useEffect(() => {
    if (!routes.length) {
      return;
    }

    const closest = routes
      .map((route) => ({
        route,
        distance: distanceMeters(mapCenter, { lat: route.start_lat, lng: route.start_lng })
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!closest || closest.distance > SUGGEST_RADIUS_METERS) {
      return;
    }

    if (promptedRouteRef.current === closest.route.id) {
      return;
    }

    promptedRouteRef.current = closest.route.id;
    Alert.alert("Spot cercano", `Estas cerca de "${closest.route.title}". Quieres marcar que estas aqui?`, [
      { text: "Ahora no", style: "cancel" },
      {
        text: "Si, marcar",
        onPress: async () => {
          await onSelectRoute(closest.route);
          try {
            await checkInRoutePresence(closest.route.id, null);
            await loadPresence(closest.route.id);
          } catch (error) {
            console.error("No se pudo marcar presencia automatica:", error);
          }
        }
      }
    ]);
  }, [loadPresence, mapCenter, onSelectRoute, routes]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.buttonContainer}>
          <AppButton label="Nueva" onPress={() => router.push("/routes/new")} variant="secondary" />
        </View>
      </View>

      <Card style={styles.mapCard}>
        <MapView
          mapType="standard"
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          onRegionChangeComplete={setVisibleRegion}
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
          {canRenderRoutes
            ? visibleRoutes.map((route) => (
                <Marker
                  key={route.id}
                  coordinate={{ latitude: route.start_lat, longitude: route.start_lng }}
                  onPress={() => onSelectRoute(route)}
                  anchor={{ x: 0.5, y: 1 }}
                  image={MARKER_XL}
                  tracksViewChanges={false}
                />
              ))
            : null}

          {selectedRoutePoints.length > 1 ? (
            <Polyline coordinates={selectedRoutePoints.map(toMapCoordinate)} strokeColor="#FF6A00" strokeWidth={4} />
          ) : null}
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
          <View style={styles.topStatsCard}>
            <Text style={styles.topStatsText}>Rutas visibles: {canRenderRoutes ? visibleRoutes.length : "-"}</Text>
            <Text style={styles.topStatsText}>Riders visibles: {canRenderRoutes ? visibleRidersTotal : "-"}</Text>
            {!canRenderRoutes ? <Text style={styles.topStatsHint}>Acerca el zoom para cargar rutas</Text> : null}
          </View>
        </View>

        {selectedRoute ? (
          <View style={styles.overlay}>
            <Card style={styles.overlayCard}>
              <View style={styles.selectedOverlayHead}>
                <View style={styles.selectedTitleWrap}>
                  <Text style={styles.overlayTitle}>{selectedRoute.title}</Text>
                  <View style={styles.selectedKmBadge}>
                    <Text style={styles.selectedKmBadgeText}>
                      {selectedRoute.distance_km != null ? `${selectedRoute.distance_km} km` : "spot"}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={onClearSelection} style={styles.closeBtn}>
                  <Ionicons name="close" size={16} color="#111827" />
                </Pressable>
              </View>

              <Text style={styles.overlayMeta}>
                Distancia: {selectedRoute.distance_km ?? "-"} km - {loadingRoutePath ? "cargando trazado" : "trazado listo"}
              </Text>
              <Text style={styles.overlayMeta}>
                Gente en este spot: {loadingPresence ? "..." : presenceCount != null ? presenceCount : "--"}
              </Text>

              {presenceMembers.length > 0 ? (
                <View style={styles.members}>
                  {presenceMembers.slice(0, 4).map((member) => (
                    <Text key={`${member.user_id}-${member.checked_in_at}`} style={styles.memberText}>
                      @{member.username ?? "rider"} - {member.bike_brand ?? "-"} {member.bike_model ?? ""}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.overlayActions}>
                <Pressable onPress={() => router.push(`/routes/${selectedRoute.id}`)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Ver ruta</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    animateToRoute(selectedRoute);
                  }}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>Zoom spot</Text>
                </Pressable>
                <Pressable onPress={onCheckIn} style={[styles.actionBtn, checkingIn && styles.actionBtnDisabled]} disabled={checkingIn}>
                  <Text style={styles.actionBtnText}>{checkingIn ? "Marcando" : "Estoy aqui"}</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        ) : null}
      </Card>
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
    right: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8
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
  topStatsCard: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E8EE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#7A8594",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    justifyContent: "center"
  },
  topStatsText: {
    color: "#111827",
    fontSize: 12
  },
  topStatsHint: {
    color: "#FF6A00",
    fontSize: 11,
    marginTop: 2
  },
  overlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 90
  },
  overlayCard: {
    gap: 7
  },
  selectedOverlayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  selectedTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8
  },
  overlayTitle: {
    color: "#111827",
    fontSize: 16
  },
  selectedKmBadge: {
    backgroundColor: "#FFF1E7",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFC9AA",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  selectedKmBadgeText: {
    color: "#FF6A00",
    fontSize: 11
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center"
  },
  overlayMeta: {
    color: "#4B5563",
    fontSize: 12
  },
  members: {
    gap: 2
  },
  memberText: {
    color: "#111827",
    fontSize: 12
  },
  overlayActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  actionBtnDisabled: {
    backgroundColor: "#9CA3AF"
  },
  actionBtnText: {
    color: theme.colors.white,
    fontSize: 12
  }
});
