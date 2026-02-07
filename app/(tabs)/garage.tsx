import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { GarageBike, addBikeMod, createBike, fetchGarage } from "@/services/garage";

export default function GarageScreen() {
  const { user } = useAuth();
  const [bikes, setBikes] = useState<GarageBike[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [newBikeBrand, setNewBikeBrand] = useState("");
  const [newBikeModel, setNewBikeModel] = useState("");
  const [newBikeYear, setNewBikeYear] = useState("");
  const [newBikeNickname, setNewBikeNickname] = useState("");
  const [modDrafts, setModDrafts] = useState<Record<string, string>>({});
  const [modSavingFor, setModSavingFor] = useState<string | null>(null);

  const loadGarage = useCallback(async () => {
    if (!user) {
      return;
    }

    const data = await fetchGarage(user.id);
    setBikes(data);
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
      return;
    }

    setLoadingCreate(true);
    try {
      await createBike(
        {
          brand: newBikeBrand.trim(),
          model: newBikeModel.trim(),
          year: newBikeYear ? Number(newBikeYear) : null,
          nickname: newBikeNickname.trim() || null,
          is_public: true
        },
        user.id
      );
      setNewBikeBrand("");
      setNewBikeModel("");
      setNewBikeYear("");
      setNewBikeNickname("");
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

  return (
    <Screen>
      <FlatList
        data={bikes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl tintColor="#ff6d00" refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Card style={styles.newBikeCard}>
            <Text style={styles.sectionTitle}>Nueva moto</Text>
            <LabeledInput label="Marca" value={newBikeBrand} onChangeText={setNewBikeBrand} />
            <LabeledInput label="Modelo" value={newBikeModel} onChangeText={setNewBikeModel} />
            <LabeledInput label="Ano" value={newBikeYear} onChangeText={setNewBikeYear} keyboardType="number-pad" />
            <LabeledInput label="Apodo (opcional)" value={newBikeNickname} onChangeText={setNewBikeNickname} />
            <AppButton label="Guardar en mi garaje" onPress={onCreateBike} loading={loadingCreate} />
          </Card>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Tu garaje esta vacio</Text>
            <Text style={styles.emptyText}>Crea tu primera moto arriba.</Text>
          </Card>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.bikeCard}>
            <Text style={styles.bikeTitle}>
              {item.brand} {item.model} {item.year ? `(${item.year})` : ""}
            </Text>
            <Text style={styles.bikeSubtitle}>{item.nickname ?? "Sin apodo"}</Text>

            <View style={styles.modList}>
              {item.bike_mods.length === 0 ? (
                <Text style={styles.modItem}>Sin modificaciones aun.</Text>
              ) : (
                item.bike_mods.map((mod) => (
                  <Text key={mod.id} style={styles.modItem}>
                    • {mod.name}
                  </Text>
                ))
              )}
            </View>

            <View style={styles.modForm}>
              <LabeledInput
                label="Nueva mod"
                value={modDrafts[item.id] ?? ""}
                onChangeText={(value) => setModDrafts((current) => ({ ...current, [item.id]: value }))}
              />
              <AppButton
                label="Anadir mod"
                variant="secondary"
                onPress={() => onAddMod(item.id)}
                loading={modSavingFor === item.id}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 30
  },
  sectionTitle: {
    color: "#f8fbff",
    fontSize: 19,
    fontWeight: "800"
  },
  newBikeCard: {
    gap: 10
  },
  bikeCard: {
    gap: 8
  },
  bikeTitle: {
    color: "#f8fbff",
    fontWeight: "900",
    fontSize: 17
  },
  bikeSubtitle: {
    color: "#9eb4cd"
  },
  modList: {
    gap: 4
  },
  modItem: {
    color: "#c5d7ea"
  },
  modForm: {
    gap: 8,
    marginTop: 6
  },
  emptyCard: {
    marginTop: 12
  },
  emptyTitle: {
    color: "#f8fbff",
    fontWeight: "800",
    fontSize: 18
  },
  emptyText: {
    color: "#9eb4cd",
    marginTop: 6
  }
});
