import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const onRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert("Faltan datos", "Email, username y password son obligatorios.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password corta", "Usa al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim());
      router.replace("/(tabs)/routes");
    } catch (error) {
      Alert.alert("No se pudo registrar", String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Configura tu perfil rider</Text>
      </View>

      <Card style={styles.card}>
        <LabeledInput label="Username" value={username} onChangeText={setUsername} />
        <LabeledInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <AppButton label="Registrarme" onPress={onRegister} loading={loading} />
      </Card>

      <Text style={styles.footer}>
        Ya tienes cuenta?{" "}
        <Link href="/(auth)/login" style={styles.link}>
          Entrar
        </Link>
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
    color: "#111827",
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 15
  },
  card: {
    gap: 12
  },
  footer: {
    color: "#6B7280",
    marginTop: 18,
    textAlign: "center"
  },
  link: {
    color: "#FF6A00",
    fontWeight: "700"
  }
});
