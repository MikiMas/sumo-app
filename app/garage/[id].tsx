import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, Screen, ShimmerCard } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { uploadImageFromUriRaw } from "@/services/media";
import { GarageBike, addBikeMedia, fetchGarageBike, updateGarageBike } from "@/services/garage";

export default function GarageBikeDetailScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const bikeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [bike, setBike] = useState<GarageBike | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMainPhoto, setUploadingMainPhoto] = useState(false);
  const [uploadingExtraPhoto, setUploadingExtraPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");

  const loadBike = useCallback(async () => {
    if (!bikeId) {
      return;
    }

    setLoading(true);
    try {
      const data = await fetchGarageBike(bikeId);
      setBike(data);
    } catch (error) {
      Alert.alert("Error", `No se pudo cargar la moto: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [bikeId]);

  useEffect(() => {
    loadBike();
  }, [loadBike]);

  useEffect(() => {
    if (!bike) {
      return;
    }
    setEditBrand(bike.brand ?? "");
    setEditModel(bike.model ?? "");
    setEditYear(bike.year != null ? String(bike.year) : "");
  }, [bike]);

  const onSaveBike = async () => {
    if (!bikeId || saving) {
      return;
    }

    const cleanBrand = editBrand.trim();
    const cleanModel = editModel.trim();
    if (!cleanBrand || !cleanModel) {
      Alert.alert("Faltan datos", "Marca y modelo son obligatorios.");
      return;
    }

    let yearValue: number | null = null;
    if (editYear.trim()) {
      const parsed = Number(editYear.trim());
      if (!Number.isFinite(parsed)) {
        Alert.alert("Año inválido", "El año debe ser numérico.");
        return;
      }
      yearValue = Math.trunc(parsed);
    }

    setSaving(true);
    try {
      const updated = await updateGarageBike(bikeId, {
        brand: cleanBrand,
        model: cleanModel,
        year: yearValue
      });
      setBike(updated);
      setShowEditModal(false);
    } catch (error) {
      Alert.alert("No se pudo guardar", String(error));
    } finally {
      setSaving(false);
    }
  };

  const onPickMainPhoto = async () => {
    if (!bikeId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas permiso para abrir la galería.");
      return;
    }
    if (!session?.accessToken) {
      Alert.alert("Sesión", "Inicia sesión de nuevo para subir imagen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setUploadingMainPhoto(true);
    try {
      const url = await uploadImageFromUriRaw(result.assets[0].uri, "bike-main", session.accessToken);
      const updated = await updateGarageBike(bikeId, {
        photo_url: url
      });
      setBike(updated);
    } catch (error) {
      Alert.alert("No se pudo subir imagen", String(error));
    } finally {
      setUploadingMainPhoto(false);
    }
  };

  const onPickExtraPhoto = async () => {
    if (!bikeId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas permiso para abrir la galería.");
      return;
    }
    if (!session?.accessToken) {
      Alert.alert("Sesión", "Inicia sesión de nuevo para subir imagen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setUploadingExtraPhoto(true);
    try {
      const url = await uploadImageFromUriRaw(result.assets[0].uri, "bike-media", session.accessToken);
      await addBikeMedia(bikeId, url, null);
      await loadBike();
    } catch (error) {
      Alert.alert("No se pudo subir imagen", String(error));
    } finally {
      setUploadingExtraPhoto(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: bike ? `${bike.brand} ${bike.model}` : "Moto" }} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <ShimmerCard />
            <ShimmerCard lines={5} />
            <ShimmerCard lines={3} />
          </>
        ) : !bike ? (
          <Card>
            <Text style={styles.emptyText}>No se encontró este vehículo.</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.heroCard}>
              <View style={styles.heroImageWrap}>
                {bike.photo_url ? (
                  <Image source={{ uri: bike.photo_url }} style={styles.heroImage} />
                ) : (
                  <View style={styles.heroFallback}>
                    <Ionicons name="bicycle-outline" size={30} color="#FF7A00" />
                  </View>
                )}
                <Pressable
                  style={[styles.floatingIconBtn, uploadingMainPhoto && styles.iconBtnDisabled]}
                  onPress={onPickMainPhoto}
                  disabled={uploadingMainPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar foto principal"
                >
                  <Ionicons name={uploadingMainPhoto ? "cloud-upload-outline" : "camera-outline"} size={17} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>
                  {bike.brand} {bike.model}
                </Text>
                <Text style={styles.heroYear}>{bike.year ? String(bike.year) : "Año -"}</Text>
              </View>
            </Card>

            <Card style={styles.profileCard}>
              <View style={styles.rowHeaderEnd}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => setShowEditModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar datos de la moto"
                >
                  <Ionicons name="pencil" size={16} color="#111111" />
                </Pressable>
              </View>

              <View style={styles.dataList}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Marca</Text>
                  <Text style={styles.dataValue}>{bike.brand || "-"}</Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Modelo</Text>
                  <Text style={styles.dataValue}>{bike.model || "-"}</Text>
                </View>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Año</Text>
                  <Text style={styles.dataValue}>{bike.year ? String(bike.year) : "-"}</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.mediaCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.sectionTitle}>Fotos</Text>
                <Pressable
                  style={[styles.iconBtnDark, uploadingExtraPhoto && styles.iconBtnDisabled]}
                  onPress={onPickExtraPhoto}
                  disabled={uploadingExtraPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir foto"
                >
                  <Ionicons name={uploadingExtraPhoto ? "cloud-upload-outline" : "add"} size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.mediaGrid}>
                {(bike.bike_media ?? []).length === 0 ? (
                  <Text style={styles.emptyText}>Sin fotos</Text>
                ) : (
                  (bike.bike_media ?? []).map((media) => <Image key={media.id} source={{ uri: media.media_url }} style={styles.mediaThumb} />)
                )}
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowEditModal(false)} />
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar</Text>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setShowEditModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar edición"
              >
                <Ionicons name="close" size={17} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Marca</Text>
              <TextInput value={editBrand} onChangeText={setEditBrand} style={styles.textInput} placeholder="Marca" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Modelo</Text>
              <TextInput value={editModel} onChangeText={setEditModel} style={styles.textInput} placeholder="Modelo" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Año</Text>
              <TextInput
                value={editYear}
                onChangeText={setEditYear}
                style={styles.textInput}
                placeholder="Año"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setShowEditModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar cambios"
              >
                <Ionicons name="close" size={18} color="#111111" />
              </Pressable>
              <Pressable
                style={[styles.iconBtnDark, saving && styles.iconBtnDisabled]}
                onPress={onSaveBike}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Guardar cambios"
              >
                <Ionicons name={saving ? "hourglass-outline" : "checkmark"} size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 24
  },
  heroCard: {
    gap: 10
  },
  heroImageWrap: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111111"
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  heroFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F0F10"
  },
  floatingIconBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#374151"
  },
  heroTextWrap: {
    gap: 4
  },
  heroTitle: {
    color: "#111111",
    fontSize: 24
  },
  heroYear: {
    color: "#6B7280",
    fontSize: 14
  },
  profileCard: {
    gap: 10
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowHeaderEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center"
  },
  sectionTitle: {
    color: "#111111",
    fontSize: 18
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  iconBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111111",
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center"
  },
  iconBtnDisabled: {
    opacity: 0.55
  },
  dataList: {
    gap: 8
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  dataLabel: {
    color: "#6B7280",
    fontSize: 12
  },
  dataValue: {
    color: "#111111",
    fontSize: 14
  },
  mediaCard: {
    gap: 10
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  mediaThumb: {
    width: 88,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#EEF2F7"
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    padding: 14
  },
  modalCard: {
    gap: 10
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    color: "#111111",
    fontSize: 20
  },
  fieldGroup: {
    gap: 6
  },
  fieldLabel: {
    color: "#6B7280",
    fontSize: 13
  },
  textInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    color: "#111111",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8
  }
});


