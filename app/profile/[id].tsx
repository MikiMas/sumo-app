import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Screen } from "@/components/ui";
import { FeedPost, PublicProfile, fetchProfilePosts } from "@/services/feed";

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const result = await fetchProfilePosts(profileId, 50, 0);
      setProfile(result.profile);
      setPosts(result.posts);
    } catch (error) {
      Alert.alert("No se pudo cargar perfil", String(error));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <Card>
            <Text style={styles.loadingText}>Cargando perfil...</Text>
          </Card>
        ) : !profile ? (
          <Card>
            <Text style={styles.loadingText}>Perfil no encontrado.</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.topRow}>
                <View style={styles.avatarWrap}>
                  {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <Ionicons name="person" size={36} color="#FF6A00" />
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

            <Card style={styles.postsCard}>
              <Text style={styles.postsTitle}>Publicaciones ({posts.length})</Text>
              {posts.length === 0 ? (
                <Text style={styles.emptyText}>No hay publicaciones aun.</Text>
              ) : (
                <View style={styles.postsList}>
                  {posts.map((post) => {
                    const first = post.post_media?.[0];
                    return (
                      <View key={post.id} style={styles.postTile}>
                        {first?.media_type === "image" ? (
                          <Image source={{ uri: first.media_url }} style={styles.postImage} />
                        ) : first?.media_type === "video" ? (
                          <View style={styles.videoTile}>
                            <Ionicons name="videocam" size={18} color="#FF6A00" />
                            <Text style={styles.videoText}>Video</Text>
                          </View>
                        ) : null}
                        <Text style={styles.postBody}>{post.body}</Text>
                        <Text style={styles.postStats}>
                          {post.likes_count} likes · {post.comments_count} comentarios
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 24
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
    width: 86,
    height: 86,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFC9AA",
    backgroundColor: "#FFF4EC",
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
  postsCard: {
    gap: 8
  },
  postsTitle: {
    color: "#111827",
    fontSize: 18
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13
  },
  postsList: {
    gap: 10
  },
  postTile: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6EAF1",
    backgroundColor: "#FFFFFF",
    padding: 8,
    gap: 6
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E6EAF1"
  },
  videoTile: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD6BF",
    backgroundColor: "#FFF4EC",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  videoText: {
    color: "#FF6A00",
    fontSize: 12
  },
  postBody: {
    color: "#1F2937",
    fontSize: 13
  },
  postStats: {
    color: "#6B7280",
    fontSize: 11
  }
});
