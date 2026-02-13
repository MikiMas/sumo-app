import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { Card, Screen, ShimmerCard } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { uploadImageFromUriRaw } from "@/services/media";
import { GarageBike, createBike, fetchGarage } from "@/services/garage";

const SUPERMOTO_CATALOG: Record<string, string[]> = {
  KTM: [
    "125 XC-W",
    "250 EXC",
    "300 EXC",
    "250 EXC-F",
    "350 EXC-F",
    "450 EXC-F",
    "500 EXC-F"
  ],
  Husqvarna: [
    "TC 125",
    "TE 150",
    "TE 250",
    "TE 300",
    "FE 250",
    "FE 350",
    "FE 450",
    "FE 501"
  ],
  GASGAS: ["EC 250", "EC 300", "ES 350", "EC 450F", "ES 500"],
  Yamaha: [
    "YZ125",
    "YZ250",
    "YZ65",
    "YZ85",
    "YZ85LW",
    "YZ125X",
    "YZ250X",
    "YZ250F",
    "YZ450F",
    "YZ250FX",
    "YZ450FX",
    "WR250F",
    "WR450F"
  ],
  Honda: ["CRF250R", "CRF450R"],
  Suzuki: ["DR-Z400SM"],
  Fantic: ["XMF 125 Motard", "XMF 250 Motard"],
  TM: ["SMR 450", "SMR 530"]
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, index) => String(CURRENT_YEAR + 1 - index));

type SelectorKind = "brand" | "model" | "year";

export default function GarageScreen() {
  const { user, session } = useAuth();
  const [bikes, setBikes] = useState<GarageBike[]>([]);
  const [loadingGarage, setLoadingGarage] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [newBikeBrand, setNewBikeBrand] = useState("");
  const [newBikeModel, setNewBikeModel] = useState("");
  const [newBikeYear, setNewBikeYear] = useState("");
  const [newBikePhotoUrl, setNewBikePhotoUrl] = useState("");
  const [uploadingMainPhoto, setUploadingMainPhoto] = useState(false);
  const [openSelector, setOpenSelector] = useState<SelectorKind | null>(null);

  const brandOptions = useMemo(() => Object.keys(SUPERMOTO_CATALOG), []);
  const modelOptions = useMemo(() => SUPERMOTO_CATALOG[newBikeBrand] ?? [], [newBikeBrand]);

  const selectorOptions = useMemo(() => {
    if (openSelector === "brand") return brandOptions;
    if (openSelector === "model") return modelOptions;
    if (openSelector === "year") return YEAR_OPTIONS;
    return [] as string[];
  }, [brandOptions, modelOptions, openSelector]);

  const selectorValue = useMemo(() => {
    if (openSelector === "brand") return newBikeBrand;
    if (openSelector === "model") return newBikeModel;
    if (openSelector === "year") return newBikeYear;
    return "";
  }, [newBikeBrand, newBikeModel, newBikeYear, openSelector]);

  const loadGarage = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const data = await fetchGarage(user.id);
      setBikes(data);
    } catch (error) {
      Alert.alert("Error", `No se pudo cargar tu garaje: ${String(error)}`);
    } finally {
      setLoadingGarage(false);
    }
  }, [user]);

  useEffect(() => {
    loadGarage();
  }, [loadGarage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGarage();
    setRefreshing(false);
  };

  const resetCreateDraft = () => {
    setNewBikeBrand("");
    setNewBikeModel("");
    setNewBikeYear("");
    setNewBikePhotoUrl("");
    setOpenSelector(null);
  };

  const onCreateBike = async () => {
    if (!user || !newBikeBrand || !newBikeModel) {
      Alert.alert("Faltan datos", "Selecciona marca y modelo para guardar el vehículo.");
      return;
    }

    if (uploadingMainPhoto) {
      Alert.alert("Subiendo foto", "Espera a que termine la subida antes de guardar.");
      return;
    }

    setLoadingCreate(true);
    try {
      await createBike(
        {
          brand: newBikeBrand,
          model: newBikeModel,
          year: newBikeYear ? Number(newBikeYear) : null,
          nickname: null,
          photo_url: newBikePhotoUrl.trim() || null,
          is_public: true
        },
        user.id
      );

      resetCreateDraft();
      setShowCreateModal(false);
      await loadGarage();
    } catch (error) {
      Alert.alert("No se pudo crear el vehiculo", String(error));
    } finally {
      setLoadingCreate(false);
    }
  };

  const onPickMainPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas dar permiso para abrir la galería.");
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

    if (!session?.accessToken) {
      Alert.alert("Sesion", "Inicia sesion de nuevo para subir imagen.");
      return;
    }

    setUploadingMainPhoto(true);
    try {
      const publicUrl = await uploadImageFromUriRaw(result.assets[0].uri, "bike-main", session.accessToken);
      setNewBikePhotoUrl(publicUrl);
    } catch (error) {
      Alert.alert("No se pudo subir imagen", String(error));
    } finally {
      setUploadingMainPhoto(false);
    }
  };

  const onSelectOption = (value: string) => {
    if (openSelector === "brand") {
      setNewBikeBrand(value);
      setNewBikeModel("");
    }
    if (openSelector === "model") {
      setNewBikeModel(value);
    }
    if (openSelector === "year") {
      setNewBikeYear(value);
    }
    setOpenSelector(null);
  };

  return (
    <Screen>
      <>
        <FlatList
          data={bikes}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl tintColor="#111111" refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Pressable
              style={styles.addWideButton}
              onPress={() => setShowCreateModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Añadir vehículo"
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          }
          ListEmptyComponent={
            loadingGarage ? (
              <View style={styles.loadingWrap}>
                <ShimmerCard />
                <ShimmerCard />
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Sin vehículos</Text>
                <Text style={styles.emptyText}>Pulsa + para crear tu primera moto.</Text>
              </Card>
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/garage/${item.id}`)}>
              <Card style={styles.previewCard}>
                <View style={styles.previewRow}>
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.previewImageFallback}>
                      <Ionicons name="bicycle-outline" size={20} color="#FF7A00" />
                    </View>
                  )}

                  <View style={styles.previewInfo}>
                    <Text style={styles.previewTitle}>
                      {item.brand} {item.model}
                    </Text>
                    <Text style={styles.previewSubtitle}>{item.year ? `${item.year}` : "Año -"}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />

        <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreateModal(false)} />
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalBadge}>
                  <Ionicons name="bicycle-outline" size={15} color="#111111" />
                </View>
                <Pressable style={styles.modalCloseBtn} onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={16} color="#111111" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                <Pressable style={styles.selectField} onPress={() => setOpenSelector("brand")}>
                  <View style={styles.selectLeft}>
                    <Ionicons name="pricetag-outline" size={15} color="#6B7280" />
                    <Text style={[styles.selectText, !newBikeBrand && styles.selectPlaceholder]}>
                      {newBikeBrand || "Marca"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </Pressable>

                <Pressable
                  style={[styles.selectField, !newBikeBrand && styles.selectFieldDisabled]}
                  onPress={() => setOpenSelector("model")}
                  disabled={!newBikeBrand}
                >
                  <View style={styles.selectLeft}>
                    <Ionicons name="construct-outline" size={15} color="#6B7280" />
                    <Text style={[styles.selectText, !newBikeModel && styles.selectPlaceholder]}>{newBikeModel || "Modelo"}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </Pressable>

                <Pressable style={styles.selectField} onPress={() => setOpenSelector("year")}>
                  <View style={styles.selectLeft}>
                    <Ionicons name="calendar-outline" size={15} color="#6B7280" />
                    <Text style={[styles.selectText, !newBikeYear && styles.selectPlaceholder]}>{newBikeYear || "Año"}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </Pressable>

                <View style={styles.photoActionRow}>
                  <Pressable
                    style={[styles.iconActionBtn, uploadingMainPhoto && styles.iconActionBtnDisabled]}
                    onPress={onPickMainPhoto}
                    disabled={uploadingMainPhoto}
                    accessibilityRole="button"
                    accessibilityLabel={newBikePhotoUrl ? "Cambiar foto" : "Elegir foto"}
                  >
                    <Ionicons name={newBikePhotoUrl ? "images-outline" : "camera-outline"} size={19} color="#111111" />
                  </Pressable>
                </View>

                {newBikePhotoUrl ? <Image source={{ uri: newBikePhotoUrl }} style={styles.mainPreview} /> : null}

                <View style={styles.formActions}>
                  <Pressable
                    style={styles.iconActionBtn}
                    onPress={() => {
                      setShowCreateModal(false);
                      resetCreateDraft();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                  >
                    <Ionicons name="close" size={20} color="#111111" />
                  </Pressable>

                  <Pressable
                    style={[styles.iconActionBtnPrimary, (loadingCreate || uploadingMainPhoto) && styles.iconActionBtnDisabled]}
                    onPress={onCreateBike}
                    disabled={loadingCreate || uploadingMainPhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Guardar vehículo"
                  >
                    <Ionicons name={loadingCreate ? "hourglass-outline" : "checkmark"} size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </ScrollView>
            </Card>
          </View>
        </Modal>

        <Modal visible={openSelector != null} transparent animationType="slide" onRequestClose={() => setOpenSelector(null)}>
          <View style={styles.selectorBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenSelector(null)} />
            <Card style={styles.selectorCard}>
              <View style={styles.selectorHeaderIcon}>
                <Ionicons name="list-outline" size={16} color="#111111" />
              </View>
              <ScrollView style={styles.selectorList} contentContainerStyle={styles.selectorListContent}>
                {selectorOptions.length === 0 ? (
                  <Text style={styles.selectorEmpty}>-</Text>
                ) : (
                  selectorOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => onSelectOption(option)}
                      style={[styles.selectorOption, option === selectorValue && styles.selectorOptionActive]}
                    >
                      <Text style={[styles.selectorOptionText, option === selectorValue && styles.selectorOptionTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
              <View style={styles.selectorFooter}>
                <Pressable
                  style={styles.selectorCloseBtn}
                  onPress={() => setOpenSelector(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar selector"
                >
                  <Ionicons name="close" size={18} color="#111111" />
                </Pressable>
              </View>
            </Card>
          </View>
        </Modal>
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 120
  },
  loadingWrap: {
    gap: 10
  },
  addWideButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#0F0F10",
    borderWidth: 1,
    borderColor: "#0F0F10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  previewCard: {
    padding: 12
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  previewImage: {
    width: 92,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD2DC",
    backgroundColor: "#EEF2F7"
  },
  previewImageFallback: {
    width: 92,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD2DC",
    backgroundColor: "#F8F9FB",
    alignItems: "center",
    justifyContent: "center"
  },
  previewInfo: {
    flex: 1,
    gap: 4
  },
  previewTitle: {
    color: "#111111",
    fontSize: 19
  },
  previewSubtitle: {
    color: "#6B7280",
    fontSize: 12
  },
  emptyCard: {
    gap: 8
  },
  emptyTitle: {
    color: "#111111",
    fontSize: 22
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17,24,39,0.32)",
    padding: 14
  },
  modalCard: {
    maxHeight: "82%",
    gap: 10
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalBadge: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center"
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center"
  },
  modalScroll: {
    maxHeight: 560
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 4
  },
  selectField: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD2DC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  selectLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  selectFieldDisabled: {
    opacity: 0.55
  },
  selectText: {
    color: "#111111",
    flex: 1
  },
  selectPlaceholder: {
    color: "#9CA3AF"
  },
  photoActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  iconActionBtnPrimary: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#0F0F10",
    backgroundColor: "#0F0F10",
    alignItems: "center",
    justifyContent: "center"
  },
  iconActionBtnDisabled: {
    opacity: 0.55
  },
  mainPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD2DC",
    backgroundColor: "#EEF2F7"
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4
  },
  selectorBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 18,
    backgroundColor: "rgba(17, 24, 39, 0.3)"
  },
  selectorCard: {
    maxHeight: "65%",
    gap: 10
  },
  selectorHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center"
  },
  selectorList: {
    maxHeight: 340
  },
  selectorListContent: {
    gap: 8,
    paddingBottom: 4
  },
  selectorOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD2DC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  selectorOptionActive: {
    borderColor: "#FF7A00",
    backgroundColor: "#FFF3EA"
  },
  selectorOptionText: {
    color: "#111111"
  },
  selectorOptionTextActive: {
    color: "#D9480F"
  },
  selectorEmpty: {
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 10
  },
  selectorFooter: {
    alignItems: "flex-end"
  },
  selectorCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD2DC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  }
});
