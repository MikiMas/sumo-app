import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/ui";
import { FeedPost, PublicProfile, fetchProfilePosts } from "@/services/feed";
import { GarageBike, fetchProfileGarage } from "@/services/garage";

const PAGE_WIDTH = Dimensions.get("window").width - 32;

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const pagerRef = useRef<ScrollView | null>(null);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [garage, setGarage] = useState<GarageBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(0);

  const headerTitle = useMemo(() => {
    if (!profile) {
      return "Perfil";
    }
    return profile.display_name?.trim() || profile.username?.trim() || "Perfil";
  }, [profile]);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const [profileResult, garageResult] = await Promise.all([
        fetchProfilePosts(profileId, 50, 0),
        fetchProfileGarage(profileId)
      ]);
      setProfile(profileResult.profile);
      setPosts(profileResult.posts ?? []);
      setGarage(garageResult ?? []);
      setActivePage(0);
      pagerRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    } catch (error) {
      Alert.alert("No se pudo cargar perfil", String(error));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSelectPage = (page: number) => {
    setActivePage(page);
    pagerRef.current?.scrollTo({ x: page * PAGE_WIDTH, y: 0, animated: true });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />

      {loading ? (
        <Card>
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </Card>
      ) : !profile ? (
        <Card>
          <Text style={styles.loadingText}>Perfil no encontrado.</Text>
        </Card>
      ) : (
        <View style={styles.container}>
          <Card style={styles.headerCard}>
            <View style={styles.topRow}>
              <View style={styles.avatarWrap}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <Ionicons name="person" size={34} color="#FF7A00" />
                )}
              </View>
              <View style={styles.meta}>
                <Text style={styles.username}>@{profile.username ?? "rider"}</Text>
                {profile.display_name ? <Text style={styles.displayName}>{profile.display_name}</Text> : null}
                {profile.home_city ? <Text style={styles.city}>{profile.home_city}</Text> : null}
              </View>
            </View>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          </Card>

          <View style={styles.pagesHeader}>
            <Pressable
              style={[styles.pageIconBtn, activePage === 0 && styles.pageIconBtnActive]}
              onPress={() => onSelectPage(0)}
              accessibilityRole="button"
              accessibilityLabel="Ver garaje"
            >
              <Ionicons name="bicycle-outline" size={18} color={activePage === 0 ? "#FFFFFF" : "#111827"} />
            </Pressable>
            <Pressable
              style={[styles.pageIconBtn, activePage === 1 && styles.pageIconBtnActive]}
              onPress={() => onSelectPage(1)}
              accessibilityRole="button"
              accessibilityLabel="Ver publicaciones"
            >
              <Ionicons name="images-outline" size={18} color={activePage === 1 ? "#FFFFFF" : "#111827"} />
            </Pressable>
          </View>

          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            style={styles.pager}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const page = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
              setActivePage(Math.max(0, Math.min(page, 1)));
            }}
            contentContainerStyle={styles.pagerContent}
          >
            <View style={[styles.page, { width: PAGE_WIDTH }]}>
              <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageScrollContent} showsVerticalScrollIndicator={false}>
                {garage.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyText}>Sin motos publicas.</Text>
                  </Card>
                ) : (
                  garage.map((bike) => (
                    <Card key={bike.id} style={styles.bikeCard}>
                      <View style={styles.bikeRow}>
                        {bike.photo_url ? (
                          <Image source={{ uri: bike.photo_url }} style={styles.bikeImage} />
                        ) : (
                          <View style={styles.bikeImageFallback}>
                            <Ionicons name="bicycle-outline" size={18} color="#FF7A00" />
                          </View>
                        )}
                        <View style={styles.bikeMeta}>
                          <Text style={styles.bikeTitle}>
                            {bike.brand} {bike.model}
                          </Text>
                          <Text style={styles.bikeYear}>{bike.year ? String(bike.year) : "Año -"}</Text>
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={[styles.page, { width: PAGE_WIDTH }]}>
              <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageScrollContent} showsVerticalScrollIndicator={false}>
                {posts.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyText}>No hay publicaciones aun.</Text>
                  </Card>
                ) : (
                  posts.map((post) => {
                    const first = post.post_media?.[0];
                    return (
                      <Card key={post.id} style={styles.postCard}>
                        {first?.media_type === "image" ? (
                          <Image source={{ uri: first.media_url }} style={styles.postImage} />
                        ) : first?.media_type === "video" ? (
                          <View style={styles.videoTile}>
                            <Ionicons name="videocam" size={18} color="#FF7A00" />
                          </View>
                        ) : null}
                        <Text style={styles.postBody}>{post.body}</Text>
                      </Card>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10
  },
  loadingText: {
    color: "#111827"
  },
  headerCard: {
    gap: 10
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#22C55E",
    backgroundColor: "#0F1113",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  meta: {
    flex: 1,
    gap: 3
  },
  username: {
    color: "#111827",
    fontSize: 22
  },
  displayName: {
    color: "#1F2937",
    fontSize: 14
  },
  city: {
    color: "#6B7280",
    fontSize: 12
  },
  bio: {
    color: "#4B5563",
    fontSize: 13
  },
  pagesHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8
  },
  pageIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE3EC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  pageIconBtnActive: {
    backgroundColor: "#111827",
    borderColor: "#111827"
  },
  pager: {
    flex: 1
  },
  pagerContent: {
    alignItems: "flex-start"
  },
  page: {
    flex: 1
  },
  pageScroll: {
    flex: 1
  },
  pageScrollContent: {
    gap: 8,
    paddingBottom: 110
  },
  bikeCard: {
    padding: 10
  },
  bikeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  bikeImage: {
    width: 86,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE3EC",
    backgroundColor: "#F3F5F8"
  },
  bikeImageFallback: {
    width: 86,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#22C55E",
    backgroundColor: "#0F1113",
    alignItems: "center",
    justifyContent: "center"
  },
  bikeMeta: {
    flex: 1,
    gap: 3
  },
  bikeTitle: {
    color: "#111827",
    fontSize: 18
  },
  bikeYear: {
    color: "#6B7280",
    fontSize: 12
  },
  postCard: {
    padding: 10,
    gap: 8
  },
  postImage: {
    width: "100%",
    height: 176,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6EAF1"
  },
  videoTile: {
    width: "100%",
    height: 118,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD6BF",
    backgroundColor: "#FFF4EC",
    alignItems: "center",
    justifyContent: "center"
  },
  postBody: {
    color: "#1F2937",
    fontSize: 13
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13
  }
});
