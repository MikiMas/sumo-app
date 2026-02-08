import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import MapView, { MapPressEvent, Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { ensureForegroundLocationPermission, getCurrentPosition } from "@/lib/location";
import { useAuth } from "@/providers/AuthProvider";
import { buildRoadSnappedPolyline, createRoute, replaceRoutePoints } from "@/services/routes";
type DraftPoint = { lat: number; lng: number };
const EARTH_RADIUS_KM = 6371;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function segmentDistanceKm(from: DraftPoint, to: DraftPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function polylineDistanceKm(points: DraftPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    total += segmentDistanceKm(points[index], points[index + 1]);
  }
  return Number(total.toFixed(2));
}

export default function NewRouteScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [draftPoints, setDraftPoints] = useState<DraftPoint[]>([]);
  const [snappedPreview, setSnappedPreview] = useState<DraftPoint[] | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [mapCenter, setMapCenter] = useState<DraftPoint>({ lat: 40.4168, lng: -3.7038 });
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const snapRequestRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const loadInitialLocation = async () => {
      try {
        const granted = await ensureForegroundLocationPermission();
        if (!granted) {
          const latest = await Location.getForegroundPermissionsAsync();
          if (!latest.canAskAgain) {
            Alert.alert("Permiso de ubicacion bloqueado", "Activa el permiso de ubicacion en ajustes para centrar el mapa.");
          }
          return;
        }
        const coords = await getCurrentPosition();
        if (!mounted) {
          return;
        }
        const nextCenter = { lat: coords.latitude, lng: coords.longitude };
        setMapCenter(nextCenter);
        mapRef.current?.animateToRegion(
          {
            latitude: nextCenter.lat,
            longitude: nextCenter.lng,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06
          },
          500
        );
      } catch {
        // Keep default center if GPS is unavailable.
      }
    };

    loadInitialLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const runSnapPreview = useCallback(async (basePoints: DraftPoint[]) => {
    if (basePoints.length < 2) {
      setSnappedPreview(null);
      setSnapping(false);
      return;
    }

    const requestId = ++snapRequestRef.current;
    setSnapping(true);
    try {
      const snapped = await buildRoadSnappedPolyline(basePoints);
      if (snapRequestRef.current === requestId) {
        setSnappedPreview(snapped);
      }
    } catch (error) {
      console.error("No se pudo ajustar trazado en creacion:", error);
      if (snapRequestRef.current === requestId) {
        setSnappedPreview(null);
      }
    } finally {
      if (snapRequestRef.current === requestId) {
        setSnapping(false);
      }
    }
  }, []);

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const next = [...draftPoints, { lat: latitude, lng: longitude }];
    setDraftPoints(next);
    runSnapPreview(next);
  };

  const onUndoPoint = () => {
    const next = draftPoints.slice(0, -1);
    setDraftPoints(next);
    runSnapPreview(next);
  };

  const onCreateRoute = async () => {
    if (!user) {
      return;
    }

    if (!title.trim() || draftPoints.length === 0) {
      Alert.alert("Faltan datos", "Necesitas titulo y al menos un punto en el mapa.");
      return;
    }

    const start = draftPoints[0];

    setSaving(true);
    try {
      const route = await createRoute(
        {
          title: title.trim(),
          distance_km: polylineDistanceKm(snappedPreview ?? draftPoints),
          start_lat: start.lat,
          start_lng: start.lng,
          is_public: true
        },
        user.id
      );

      if ((snappedPreview ?? draftPoints).length > 1) {
        const snapped = snappedPreview ?? (await buildRoadSnappedPolyline(draftPoints));
        await replaceRoutePoints(route.id, snapped);
      }

      router.replace(`/routes/${route.id}`);
    } catch (error) {
      Alert.alert("No se pudo crear ruta", String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Card style={styles.form}>
          <LabeledInput label="Titulo" value={title} onChangeText={setTitle} />
          <View style={styles.group}>
            <Text style={styles.label}>
              Trazado en mapa (toca para anadir puntos). Puntos: {draftPoints.length}
              {snapping ? " - ajustando..." : ""}
            </Text>
            <MapView
              mapType="standard"
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: draftPoints[0]?.lat ?? mapCenter.lat,
                longitude: draftPoints[0]?.lng ?? mapCenter.lng,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06
              }}
              onPress={onMapPress}
            >
              {draftPoints.map((point, index) => (
                <Marker
                  key={`${point.lat}-${point.lng}-${index}`}
                  coordinate={{ latitude: point.lat, longitude: point.lng }}
                  title={`Punto ${index + 1}`}
                  pinColor={index === 0 ? "#ff6d00" : "#3a86ff"}
                />
              ))}
              {(snappedPreview ?? draftPoints).length > 1 ? (
                <Polyline
                  coordinates={(snappedPreview ?? draftPoints).map((point) => ({ latitude: point.lat, longitude: point.lng }))}
                  strokeColor="#2a9d8f"
                  strokeWidth={4}
                />
              ) : null}
            </MapView>
            <AppButton label="Borrar ultimo punto" variant="secondary" onPress={onUndoPoint} disabled={draftPoints.length === 0 || saving} />
          </View>
          <AppButton label="Crear ruta" onPress={onCreateRoute} loading={saving} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 24
  },
  form: {
    gap: 10
  },
  group: {
    gap: 7
  },
  label: {
    color: "#6B7280",
    fontSize: 13
  },
  map: {
    minHeight: 260,
    borderRadius: 12
  }
});
