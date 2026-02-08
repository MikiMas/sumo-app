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

import { AppButton, Card, LabeledInput, Screen, ShimmerBlock, ShimmerCard } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { uploadImageFromUriRaw } from "@/services/media";
import { GarageBike, addBikeMedia, addBikeMod, createBike, fetchGarage } from "@/services/garage";

const SUPERMOTO_CATALOG: Record<string, string[]> = {
  KTM: [
    "125 XC-W (2T)",
    "250 EXC (2T)",
    "300 EXC (2T)",
    "250 EXC-F (4T)",
    "350 EXC-F (4T)",
    "450 EXC-F (4T)",
    "500 EXC-F (4T)"
  ],
  Husqvarna: [
    "TC 125 (2T)",
    "TE 150 (2T)",
    "TE 250 (2T)",
    "TE 300 (2T)",
    "FE 250 (4T)",
    "FE 350 (4T)",
    "FE 450 (4T)",
    "FE 501 (4T)"
  ],
  GASGAS: ["EC 250 (2T)", "EC 300 (2T)", "ES 350 (4T)", "EC 450F (4T)", "ES 500 (4T)"],
  Yamaha: [
    "YZ125 (2T)",
    "YZ250 (2T)",
    "YZ65 (2T)",
    "YZ85 (2T)",
    "YZ85LW (2T)",
    "YZ125X (2T)",
    "YZ250X (2T)",
    "YZ250F (4T)",
    "YZ450F (4T)",
    "YZ250FX (4T)",
    "YZ450FX (4T)",
    "WR250F (4T)",
    "WR450F (4T)"
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
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBikeBrand, setNewBikeBrand] = useState("");
  const [newBikeModel, setNewBikeModel] = useState("");
  const [newBikeYear, setNewBikeYear] = useState("");
  const [newBikePhotoUrl, setNewBikePhotoUrl] = useState("");
  const [uploadingMainPhoto, setUploadingMainPhoto] = useState(false);
  const [uploadingExtraFor, setUploadingExtraFor] = useState<string | null>(null);
  const [openSelector, setOpenSelector] = useState<SelectorKind | null>(null);
  const [modDrafts, setModDrafts] = useState<Record<string, string>>({});
  const [modSavingFor, setModSavingFor] = useState<string | null>(null);

  const brandOptions = useMemo(() => Object.keys(SUPERMOTO_CATALOG), []);
  const modelOptions = useMemo(() => SUPERMOTO_CATALOG[newBikeBrand] ?? [], [newBikeBrand]);

  const selectorOptions = useMemo(() => {
    if (openSelector === "brand") {
      return brandOptions;
    }
    if (openSelector === "model") {
      return modelOptions;
    }
    if (openSelector === "year") {
      return YEAR_OPTIONS;
    }
    return [] as string[];
  }, [brandOptions, modelOptions, openSelector]);

  const selectorTitle = useMemo(() => {
    if (openSelector === "brand") return "Selecciona marca";
    if (openSelector === "model") return "Selecciona modelo";
    if (openSelector === "year") return "Selecciona año";
    return "";
  }, [openSelector]);

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

  const onCreateBike = async () => {
    if (!user || !newBikeBrand || !newBikeModel) {
      Alert.alert("Faltan datos", "Selecciona marca y modelo para guardar el vehiculo.");
      return;
    }
    if (uploadingMainPhoto) {
      Alert.alert("Subiendo foto", "Espera a que termine la subida de la foto antes de guardar.");
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
      setNewBikeBrand("");
      setNewBikeModel("");
      setNewBikeYear("");
      setNewBikePhotoUrl("");
      setShowCreateForm(false);
      await loadGarage();
    } catch (error) {
      console.error("Error creando moto:", error);
    } finally {
      setLoadingCreate(false);
    }
  };

  const onAddMod = async (bikeId: string) => {
    const draft = modDrafts[bikeId]?.trim();
    if (!draft) {
      return;
    }

    setModSavingFor(bikeId);
    try {
      await addBikeMod({
        bike_id: bikeId,
        name: draft
      });
      setModDrafts((current) => ({ ...current, [bikeId]: "" }));
      await loadGarage();
    } catch (error) {
      console.error("Error guardando mod:", error);
    } finally {
      setModSavingFor(null);
    }
  };

  const onPickMainPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas dar permiso para abrir la galeria.");
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

  const onPickExtraPhoto = async (bikeId: string) => {
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

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }
    if (!session?.accessToken) {
      Alert.alert("Sesion", "Inicia sesion de nuevo para subir imagen.");
      return;
    }

    setUploadingExtraFor(bikeId);
    try {
      const publicUrl = await uploadImageFromUriRaw(result.assets[0].uri, "bike-media", session.accessToken);
      await addBikeMedia(bikeId, publicUrl, null);
      await loadGarage();
    } catch (error) {
      Alert.alert("No se pudo subir imagen", String(error));
    } finally {
      setUploadingExtraFor(null);
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
          refreshControl={<RefreshControl tintColor="#ff6d00" refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          scrollEnabled
          showsVerticalScrollIndicator
          alwaysBounceVertical
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              {!showCreateForm ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>{bikes.length === 0 ? "No tienes ningun vehiculo" : "Añade otro vehiculo"}</Text>
                  <Text style={styles.emptyText}>
                    {bikes.length === 0
                      ? "Empieza creando tu primera moto para tu perfil."
                      : "Selecciona marca, modelo y año desde listas desplegables."}
                  </Text>
                  <AppButton label="Añadir vehiculo" onPress={() => setShowCreateForm(true)} />
                </Card>
              ) : (
                <Card style={styles.newBikeCard}>
                  <Text style={styles.sectionTitle}>Nuevo vehiculo</Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.groupLabel}>Marca</Text>
                    <Pressable style={styles.selectField} onPress={() => setOpenSelector("brand")}>
                      <Text style={[styles.selectText, !newBikeBrand && styles.selectPlaceholder]}>
                        {newBikeBrand || "Selecciona marca"}
                      </Text>
                      <Text style={styles.selectArrow}>v</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.groupLabel}>Modelo</Text>
                    <Pressable
                      style={[styles.selectField, !newBikeBrand && styles.selectFieldDisabled]}
                      onPress={() => setOpenSelector("model")}
                      disabled={!newBikeBrand}
                    >
                      <Text style={[styles.selectText, !newBikeModel && styles.selectPlaceholder]}>
                        {newBikeModel || (newBikeBrand ? "Selecciona modelo" : "Primero selecciona marca")}
                      </Text>
                      <Text style={styles.selectArrow}>v</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.groupLabel}>Año</Text>
                    <Pressable style={styles.selectField} onPress={() => setOpenSelector("year")}>
                      <Text style={[styles.selectText, !newBikeYear && styles.selectPlaceholder]}>{newBikeYear || "Selecciona año"}</Text>
                      <Text style={styles.selectArrow}>v</Text>
                    </Pressable>
                  </View>

                  <AppButton
                    label={newBikePhotoUrl ? "Cambiar foto de galeria" : "Elegir foto de galeria (opcional)"}
                    variant="secondary"
                    onPress={onPickMainPhoto}
                    loading={uploadingMainPhoto}
                  />

                  {newBikePhotoUrl ? <Image source={{ uri: newBikePhotoUrl }} style={styles.mainPreview} /> : null}

                  <View style={styles.formActions}>
                    <AppButton label="Guardar en mi garaje" onPress={onCreateBike} loading={loadingCreate} disabled={uploadingMainPhoto} />
                    <AppButton label="Cancelar" variant="secondary" onPress={() => setShowCreateForm(false)} />
                  </View>
                </Card>
              )}
            </View>
          }
          ListEmptyComponent={
            loadingGarage ? (
              <View style={styles.loadingWrap}>
                <ShimmerCard />
                <ShimmerCard />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={styles.bikeCard}>
              <View style={styles.bikeTop}>
                <View style={styles.bikeInfo}>
                  <Text style={styles.bikeTitle}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={styles.bikeSubtitle}>{item.year ? `${item.year}` : "Año ?"}</Text>
                </View>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.bikeImage} /> : <ShimmerBlock height={72} width={92} radius={10} />}
              </View>

              <View style={styles.modList}>
                {item.bike_mods.length === 0 ? (
                  <Text style={styles.modItem}>Sin modificaciones aun.</Text>
                ) : (
                  item.bike_mods.map((mod) => (
                    <Text key={mod.id} style={styles.modItem}>
                      - {mod.name}
                    </Text>
                  ))
                )}
              </View>

              <View style={styles.mediaStrip}>
                {(item.bike_media ?? []).length === 0 ? (
                  <Text style={styles.modItem}>Sin fotos extra aun.</Text>
                ) : (
                  (item.bike_media ?? []).slice(0, 6).map((media) => <Image key={media.id} source={{ uri: media.media_url }} style={styles.mediaThumb} />)
                )}
              </View>

              <View style={styles.modForm}>
                <AppButton
                  label="Añadir foto extra desde galeria"
                  variant="secondary"
                  onPress={() => onPickExtraPhoto(item.id)}
                  loading={uploadingExtraFor === item.id}
                />
                <Text style={styles.helperText}>Se sube y se guarda automaticamente.</Text>
              </View>

              <View style={styles.modForm}>
                <LabeledInput
                  label="Nueva mod"
                  value={modDrafts[item.id] ?? ""}
                  onChangeText={(value) => setModDrafts((current) => ({ ...current, [item.id]: value }))}
                />
                <AppButton
                  label="Añadir mod"
                  variant="secondary"
                  onPress={() => onAddMod(item.id)}
                  loading={modSavingFor === item.id}
                />
              </View>
            </Card>
          )}
        />

        <Modal visible={openSelector != null} transparent animationType="slide" onRequestClose={() => setOpenSelector(null)}>
          <View style={styles.selectorBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenSelector(null)} />
            <Card style={styles.selectorCard}>
              <Text style={styles.selectorTitle}>{selectorTitle}</Text>
              <ScrollView style={styles.selectorList} contentContainerStyle={styles.selectorListContent}>
                {selectorOptions.length === 0 ? (
                  <Text style={styles.helperText}>No hay opciones disponibles.</Text>
                ) : (
                  selectorOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => onSelectOption(option)}
                      style={[styles.selectorOption, option === selectorValue && styles.selectorOptionActive]}
                    >
                      <Text style={[styles.selectorOptionText, option === selectorValue && styles.selectorOptionTextActive]}>{option}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
              <AppButton label="Cerrar" variant="secondary" onPress={() => setOpenSelector(null)} />
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
  headerBlock: {
    marginBottom: 8
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900"
  },
  newBikeCard: {
    gap: 10
  },
  fieldGroup: {
    gap: 6
  },
  groupLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700"
  },
  selectField: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  selectFieldDisabled: {
    opacity: 0.6
  },
  selectText: {
    color: "#111827",
    fontWeight: "700",
    flex: 1
  },
  selectPlaceholder: {
    color: "#9CA3AF"
  },
  selectArrow: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "900"
  },
  helperText: {
    color: "#6B7280",
    fontSize: 12
  },
  mainPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    backgroundColor: "#EEF2F7"
  },
  formActions: {
    gap: 8,
    marginTop: 6
  },
  bikeCard: {
    gap: 10
  },
  bikeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  bikeInfo: {
    flex: 1,
    gap: 4
  },
  bikeTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 18
  },
  bikeSubtitle: {
    color: "#6B7280"
  },
  bikeImage: {
    width: 92,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#35506b",
    backgroundColor: "#0a1016"
  },
  modList: {
    gap: 4
  },
  mediaStrip: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  mediaThumb: {
    width: 68,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#35506b",
    backgroundColor: "#0a1016"
  },
  modItem: {
    color: "#4B5563"
  },
  modForm: {
    gap: 8,
    marginTop: 2
  },
  emptyCard: {
    gap: 10
  },
  emptyTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 20
  },
  emptyText: {
    color: "#6B7280"
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
  selectorTitle: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 18
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
    borderColor: "#D8DEE8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  selectorOptionActive: {
    borderColor: "#FF6A00",
    backgroundColor: "#FFF1E7"
  },
  selectorOptionText: {
    color: "#111827",
    fontWeight: "700"
  },
  selectorOptionTextActive: {
    color: "#D9480F"
  }
});

