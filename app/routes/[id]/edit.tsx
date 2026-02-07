import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapping, setSnapping] = useState(false);

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

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPoints((current) => [...current, { lat: latitude, lng: longitude }]);
    setSnappedPreview(null);
  };

  const onUndo = () => {
    setPoints((current) => current.slice(0, -1));
    setSnappedPreview(null);
  };

  const onClear = () => {
    setPoints([]);
    setSnappedPreview(null);
  };

  const onSnapPreview = async () => {
    if (points.length < 2) {
      Alert.alert("Minimo 2 puntos", "Necesitas al menos 2 puntos para ajustar a carretera.");
      return;
    }

    setSnapping(true);
    try {
      const snapped = await buildRoadSnappedPolyline(points);
      setSnappedPreview(snapped);
    } catch (error) {
      Alert.alert("No se pudo ajustar", "No pude calcular la carretera con el servicio de rutas.");
      console.error(error);
    } finally {
      setSnapping(false);
    }
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
        </Card>

        {loading || !region ? (
          <Card>
            <Text style={styles.loading}>Cargando mapa...</Text>
          </Card>
        ) : (
          <MapView style={styles.map} initialRegion={region} onPress={onMapPress}>
            <Marker coordinate={{ latitude: route!.start_lat, longitude: route!.start_lng }} title="Inicio de ruta" pinColor="#ff6d00" />
            {points.map((point, index) => (
              <Marker
                key={`${point.lat}-${point.lng}-${index}`}
                coordinate={{ latitude: point.lat, longitude: point.lng }}
                title={`Punto ${index + 1}`}
                pinColor="#3a86ff"
              />
            ))}
            {points.length > 1 ? (
              <Polyline coordinates={points.map((point) => ({ latitude: point.lat, longitude: point.lng }))} strokeColor="#ff9e54" strokeWidth={4} />
            ) : null}
            {snappedPreview && snappedPreview.length > 1 ? (
              <Polyline
                coordinates={snappedPreview.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
                strokeColor="#2a9d8f"
                strokeWidth={4}
              />
            ) : null}
          </MapView>
        )}

        <View style={styles.actions}>
          <AppButton label="Deshacer ultimo" variant="secondary" onPress={onUndo} disabled={points.length === 0 || saving} />
          <AppButton label="Borrar todo" variant="danger" onPress={onClear} disabled={points.length === 0 || saving} />
          <AppButton label="Ajustar a carretera" variant="secondary" onPress={onSnapPreview} loading={snapping} disabled={saving} />
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
    color: "#f8fbff",
    fontWeight: "900",
    fontSize: 21
  },
  subtitle: {
    color: "#c5d7ea"
  },
  loading: {
    color: "#f8fbff"
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
