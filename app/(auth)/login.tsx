import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Faltan datos", "Rellena email y password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)/routes");
    } catch (error) {
      Alert.alert("No se pudo iniciar sesion", String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>SUMO</Text>
        <Text style={styles.subtitle}>Comunidad supermotard en ruta</Text>
      </View>

      <Card style={styles.card}>
        <LabeledInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <Pressable onPress={() => setShowPassword((prev) => !prev)}>
          <Text style={styles.passwordToggle}>{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</Text>
        </Pressable>
        <AppButton label="Entrar" onPress={onLogin} loading={loading} />
      </Card>

      <Text style={styles.footer}>
        No tienes cuenta?{" "}
        <Link href="/(auth)/register" style={styles.link}>
          Registrate
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
    color: "#ff6d00",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1
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
  },
  passwordToggle: {
    color: "#FF6A00",
    fontWeight: "600",
    alignSelf: "flex-end"
  }
});
