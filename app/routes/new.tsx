import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { ensureForegroundLocationPermission, getCurrentPosition } from "@/lib/location";
import { useAuth } from "@/providers/AuthProvider";
import { createRoute } from "@/services/routes";
import { RouteDifficulty } from "@/types/db";

const difficulties: RouteDifficulty[] = ["easy", "medium", "hard"];

export default function NewRouteScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [difficulty, setDifficulty] = useState<RouteDifficulty>("medium");
  const [distanceKm, setDistanceKm] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  const onUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const granted = await ensureForegroundLocationPermission();
      if (!granted) {
        Alert.alert("Permiso denegado", "No se puede crear ruta con tu posicion sin permiso de GPS.");
        return;
      }
      const coords = await getCurrentPosition();
      setStartLat(String(coords.latitude));
      setStartLng(String(coords.longitude));
    } catch (error) {
      Alert.alert("No se pudo obtener ubicacion", String(error));
    } finally {
      setLoadingLocation(false);
    }
  };

  const onCreateRoute = async () => {
    if (!user) {
      return;
    }

    if (!title.trim() || !startLat || !startLng) {
      Alert.alert("Faltan datos", "Necesitas titulo y coordenadas de inicio.");
      return;
    }

    const lat = Number(startLat);
    const lng = Number(startLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert("Coordenadas invalidas", "Lat/Lng deben ser numeros validos.");
      return;
    }

    setSaving(true);
    try {
      const route = await createRoute(
        {
          title: title.trim(),
          description: description.trim() || null,
          city: city.trim() || null,
          difficulty,
          distance_km: distanceKm ? Number(distanceKm) : null,
          estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
          start_lat: lat,
          start_lng: lng,
          is_public: true
        },
        user.id
      );

      router.replace(`/routes/${route.id}`);
    } catch (error) {
      Alert.alert("No se pudo crear ruta", String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.form}>
          <LabeledInput label="Titulo" value={title} onChangeText={setTitle} />
          <LabeledInput label="Descripcion" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <LabeledInput label="Ciudad" value={city} onChangeText={setCity} />

          <View style={styles.group}>
            <Text style={styles.label}>Dificultad</Text>
            <View style={styles.difficultyRow}>
              {difficulties.map((item) => (
                <Text
                  key={item}
                  onPress={() => setDifficulty(item)}
                  style={[styles.difficultyPill, difficulty === item && styles.difficultyPillActive]}
                >
                  {item.toUpperCase()}
                </Text>
              ))}
            </View>
          </View>

          <LabeledInput label="Distancia (km)" value={distanceKm} onChangeText={setDistanceKm} keyboardType="decimal-pad" />
          <LabeledInput
            label="Tiempo estimado (min)"
            value={estimatedMinutes}
            onChangeText={setEstimatedMinutes}
            keyboardType="number-pad"
          />
          <LabeledInput label="Latitud inicio" value={startLat} onChangeText={setStartLat} keyboardType="decimal-pad" />
          <LabeledInput label="Longitud inicio" value={startLng} onChangeText={setStartLng} keyboardType="decimal-pad" />
          <AppButton
            label="Usar mi ubicacion actual"
            variant="secondary"
            onPress={onUseCurrentLocation}
            loading={loadingLocation}
          />
          <AppButton label="Crear ruta" onPress={onCreateRoute} loading={saving} />
        </Card>
      </ScrollView>
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
    color: "#9eb4cd",
    fontSize: 13
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 8
  },
  difficultyPill: {
    borderWidth: 1,
    borderColor: "#30445c",
    color: "#adc4dc",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: "hidden",
    fontWeight: "800",
    fontSize: 12
  },
  difficultyPillActive: {
    borderColor: "#ff9e54",
    backgroundColor: "#ff9e54",
    color: "#101418"
  }
});
