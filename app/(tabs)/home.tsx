import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { fetchHomeStats } from "@/services/routes";

type Stats = {
  myBikes: number;
  publicRoutes: number;
  activeSessions: number;
};

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ myBikes: 0, publicRoutes: 0, activeSessions: 0 });

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        return;
      }

      try {
        const next = await fetchHomeStats();
        setStats(next);
      } catch (error) {
        console.error("Error cargando stats:", error);
      }
    };

    loadStats();
  }, [user]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.top}>
          <Text style={styles.title}>Hola, {profile?.display_name ?? profile?.username ?? "rider"}</Text>
          <Text style={styles.subtitle}>Todo listo para salir de tramo?</Text>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Tus motos</Text>
            <Text style={styles.statValue}>{stats.myBikes}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Rutas publicas</Text>
            <Text style={styles.statValue}>{stats.publicRoutes}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Riders activos</Text>
            <Text style={styles.statValue}>{stats.activeSessions}</Text>
          </Card>
        </View>

        <Card style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Plan de hoy</Text>
          <Text style={styles.ctaText}>Explora rutas, abre una y pulsa Iniciar ruta para compartir posicion en tiempo real.</Text>
          <View style={styles.ctaLinks}>
            <Link href="/(tabs)/routes" style={styles.ctaLink}>
              Ver rutas
            </Link>
            <Link href="/routes/new" style={styles.ctaLink}>
              Crear ruta
            </Link>
            <Link href="/(tabs)/garage" style={styles.ctaLink}>
              Ir al garaje
            </Link>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 28,
    gap: 14
  },
  top: {
    gap: 6,
    marginTop: 8
  },
  title: {
    color: "#f8fbff",
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: "#9eb4cd",
    fontSize: 15
  },
  statsGrid: {
    gap: 10
  },
  statCard: {
    gap: 6
  },
  statLabel: {
    color: "#9eb4cd",
    fontSize: 13
  },
  statValue: {
    color: "#ff9e54",
    fontSize: 30,
    fontWeight: "900"
  },
  ctaCard: {
    gap: 12
  },
  ctaTitle: {
    color: "#f8fbff",
    fontSize: 20,
    fontWeight: "800"
  },
  ctaText: {
    color: "#c5d7ea",
    lineHeight: 20
  },
  ctaLinks: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap"
  },
  ctaLink: {
    color: "#ff9e54",
    fontWeight: "700"
  }
});
