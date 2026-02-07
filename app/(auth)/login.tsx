import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Faltan datos", "Rellena email y password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);

    if (error) {
      Alert.alert("No se pudo iniciar sesion", error.message);
      return;
    }

    router.replace("/(tabs)/home");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>SUMO</Text>
        <Text style={styles.subtitle}>Comunidad supermotard en ruta</Text>
      </View>

      <Card style={styles.card}>
        <LabeledInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <AppButton label="Entrar" onPress={onLogin} loading={loading} />
      </Card>

      <Text style={styles.footer}>
        No tienes cuenta? <Link href="/(auth)/register" style={styles.link}>Registrate</Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 28,
    marginBottom: 24,
    gap: 6
  },
  title: {
    color: "#ff6d00",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1
  },
  subtitle: {
    color: "#adc4dc",
    fontSize: 15
  },
  card: {
    gap: 12
  },
  footer: {
    color: "#adc4dc",
    marginTop: 18,
    textAlign: "center"
  },
  link: {
    color: "#ff9e54",
    fontWeight: "700"
  }
});
