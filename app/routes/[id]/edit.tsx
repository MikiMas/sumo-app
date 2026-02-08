import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import MapView, { MapPressEvent, Marker, Polyline } from "react-native-maps";

import { AppButton, Card, Screen } from "@/components/ui";
import {
  RouteItem,
  RoutePoint,
  buildRoadSnappedPolyline,
  fetchRouteById,
  fetchRoutePoints,
  replaceRoutePoints
} from "@/services/routes";

type DraftPoint = { lat: number; lng: number };

export default function RouteEditScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [route, setRoute] = useState<RouteItem | null>(null);
  const [points, setPoints] = useState<DraftPoint[]>([]);
  const [snappedPreview, setSnappedPreview] = useState<DraftPoint[] | null>(null);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const snapRequestRef = useRef(0);

  const load = useCallback(async () => {
    if (!routeId) {
      return;
    }

    setLoading(true);
    try {
      const [routeData, routePoints] = await Promise.all([fetchRouteById(routeId), fetchRoutePoints(routeId)]);
      setRoute(routeData);
      setPoints(routePoints.map((point: RoutePoint) => ({ lat: point.lat, lng: point.lng })));
    } catch (error) {
      Alert.alert("Error", String(error));
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    load();
  }, [load]);

  const runSnapPreview = useCallback(async (basePoints: DraftPoint[]) => {
    if (basePoints.length < 2) {
      setSnappedPreview(null);
      setSnapError(null);
      return;
    }

    const requestId = ++snapRequestRef.current;
    setSnapping(true);
    try {
      const snapped = await buildRoadSnappedPolyline(basePoints);
      if (snapRequestRef.current === requestId) {
        setSnappedPreview(snapped);
        setSnapError(null);
      }
    } catch (error) {
      const message = String(error);
      console.error("No se pudo ajustar trazado al vuelo:", error);
      if (snapRequestRef.current === requestId) {
        setSnapError(message);
      }
    } finally {
      if (snapRequestRef.current === requestId) {
        setSnapping(false);
      }
    }
  }, []);

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const next = [...points, { lat: latitude, lng: longitude }];
    setPoints(next);
    runSnapPreview(next);
  };

  const onUndo = () => {
    const next = points.slice(0, -1);
    setPoints(next);
    runSnapPreview(next);
  };

  const onClear = () => {
    setPoints([]);
    setSnappedPreview(null);
    setSnapError(null);
    setSnapping(false);
  };

  const onSnapPreview = async () => {
    if (points.length < 2) return;
    await runSnapPreview(points);
  };

  const onSave = async () => {
    if (!routeId) {
      return;
    }

    if (points.length < 2) {
      Alert.alert("Minimo 2 puntos", "Necesitas al menos 2 puntos para definir una carretera.");
      return;
    }

    setSaving(true);
    try {
      const snapped = await buildRoadSnappedPolyline(points);
      await replaceRoutePoints(routeId, snapped);
      Alert.alert("Guardado", "El trazado de la ruta se ha guardado correctamente.");
      router.back();
    } catch (error) {
      Alert.alert("Error guardando", String(error));
    } finally {
      setSaving(false);
    }
  };

  const region = useMemo(() => {
    if (!route) {
      return undefined;
    }
    return {
      latitude: route.start_lat,
      longitude: route.start_lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06
    };
  }, [route]);

  return (
    <Screen>
      <View style={styles.container}>
        <Card style={styles.headerCard}>
          <Text style={styles.title}>Editar trazado</Text>
          <Text style={styles.subtitle}>
            Toca el mapa para anadir puntos en orden sobre la carretera. Puntos: {points.length}
          </Text>
          {snapError ? <Text style={styles.snapError}>Error de ajuste: {snapError}</Text> : null}
        </Card>

        {loading || !region ? (
          <Card>
            <Text style={styles.loading}>Cargando mapa...</Text>
          </Card>
        ) : (
          <MapView mapType="standard" style={styles.map} initialRegion={region} onPress={onMapPress}>
            <Marker coordinate={{ latitude: route!.start_lat, longitude: route!.start_lng }} title="Inicio de ruta" pinColor="#ff6d00" />
            {points.map((point, index) => (
              <Marker
                key={`${point.lat}-${point.lng}-${index}`}
                coordinate={{ latitude: point.lat, longitude: point.lng }}
                title={`Punto ${index + 1}`}
                pinColor="#3a86ff"
              />
            ))}
            {(snappedPreview ?? points).length > 1 ? (
              <Polyline
                coordinates={(snappedPreview ?? points).map((point) => ({ latitude: point.lat, longitude: point.lng }))}
                strokeColor="#2a9d8f"
                strokeWidth={4}
              />
            ) : null}
          </MapView>
        )}

        <View style={styles.actions}>
          <AppButton label="Borrar ultimo punto" variant="secondary" onPress={onUndo} disabled={points.length === 0 || saving} />
          <AppButton label="Borrar todo" variant="danger" onPress={onClear} disabled={points.length === 0 || saving} />
          <AppButton label="Recalcular ajuste" variant="secondary" onPress={onSnapPreview} loading={snapping} disabled={saving} />
          <AppButton label="Guardar trazado" onPress={onSave} loading={saving} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
    paddingBottom: 12
  },
  headerCard: {
    gap: 6
  },
  title: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 21
  },
  subtitle: {
    color: "#4B5563"
  },
  snapError: {
    color: "#ff6d6d",
    fontSize: 12
  },
  loading: {
    color: "#111827"
  },
  map: {
    flex: 1,
    minHeight: 350,
    borderRadius: 12
  },
  actions: {
    gap: 8
  }
});
