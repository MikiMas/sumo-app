import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantalla no encontrada</Text>
      <Link href="/" style={styles.link}>
        Volver al inicio
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECEFF3",
    gap: 12,
    padding: 20
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center"
  },
  link: {
    color: "#FF6A00",
    fontWeight: "700"
  }
});
