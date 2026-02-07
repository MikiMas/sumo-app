import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [bio, setBio] = useState("");
  const [defaultShare, setDefaultShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setHomeCity(profile?.home_city ?? "");
    setBio(profile?.bio ?? "");
    setDefaultShare(profile?.default_share_live_location ?? true);
  }, [profile]);

  const onSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);

    try {
      await apiRequest<{ ok: boolean }>("/api/sumo/profile/me", {
        method: "PATCH",
        auth: true,
        body: {
          display_name: displayName.trim() || null,
          home_city: homeCity.trim() || null,
          bio: bio.trim() || null,
          default_share_live_location: defaultShare
        }
      });

      await refreshProfile();
      Alert.alert("Perfil actualizado");
    } catch (error) {
      Alert.alert("No se pudo guardar", String(error));
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      Alert.alert("No se pudo cerrar sesion", String(error));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.accountCard}>
          <Text style={styles.username}>@{profile?.username ?? "rider"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Card style={styles.formCard}>
          <LabeledInput label="Nombre visible" value={displayName} onChangeText={setDisplayName} />
          <LabeledInput label="Ciudad" value={homeCity} onChangeText={setHomeCity} />
          <LabeledInput label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Compartir posicion por defecto al iniciar ruta</Text>
            <Switch value={defaultShare} onValueChange={setDefaultShare} />
          </View>
          <AppButton label="Guardar cambios" onPress={onSave} loading={saving} />
          <AppButton label="Cerrar sesion" variant="danger" onPress={onSignOut} loading={signingOut} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 30
  },
  accountCard: {
    gap: 4
  },
  username: {
    color: "#f8fbff",
    fontWeight: "900",
    fontSize: 24
  },
  email: {
    color: "#9eb4cd"
  },
  formCard: {
    gap: 10
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  switchText: {
    flex: 1,
    color: "#c5d7ea"
  }
});
