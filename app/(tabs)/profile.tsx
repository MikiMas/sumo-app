import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, LabeledInput, Screen, ShimmerBlock, ShimmerCard } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { FeedPost, fetchProfilePosts } from "@/services/feed";
import { uploadImageFromUriRaw } from "@/services/media";

export default function ProfileScreen() {
  const { user, session, profile, refreshProfile, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadMyPosts = useCallback(async () => {
    if (!profile?.id) {
      setPosts([]);
      return;
    }

    setLoadingPosts(true);
    try {
      const result = await fetchProfilePosts(profile.id, 60, 0);
      setPosts(result.posts ?? []);
    } catch (error) {
      console.error("Error cargando posts de perfil:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [profile?.id]);

  const stats = useMemo(() => {
    const likes = posts.reduce((acc, post) => acc + (post.likes_count ?? 0), 0);
    const comments = posts.reduce((acc, post) => acc + (post.comments_count ?? 0), 0);
    return { posts: posts.length, likes, comments };
  }, [posts]);

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setDisplayName(profile?.display_name ?? "");
    setHomeCity(profile?.home_city ?? "");
    setBio(profile?.bio ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  const onPickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas dar permiso para abrir la galeria.");
      return;
    }

    if (!session?.accessToken) {
      Alert.alert("Sesion", "Inicia sesion de nuevo para subir imagen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1]
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadImageFromUriRaw(result.assets[0].uri, "profile-avatar", session.accessToken);
      setAvatarUrl(publicUrl);
    } catch (error) {
      Alert.alert("No se pudo subir avatar", String(error));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    if (!user) return;

    const normalizedUsername = username.trim().replace(/^@+/, "");
    if (!normalizedUsername) {
      Alert.alert("Falta username", "Pon un @username valido.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/sumo/profile/me", {
        method: "PATCH",
        auth: true,
        body: {
          username: normalizedUsername,
          display_name: displayName.trim() || null,
          home_city: homeCity.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl
        }
      });

      await refreshProfile();
      setEditing(false);
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
      <ScrollView
        contentContainerStyle={styles.container}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
      >
        {!profile ? (
          <>
            <ShimmerCard />
            <Card style={styles.formCard}>
              <ShimmerBlock height={12} width="34%" />
              <ShimmerBlock height={44} />
              <ShimmerBlock height={12} width="24%" />
              <ShimmerBlock height={44} />
              <ShimmerBlock height={12} width="18%" />
              <ShimmerBlock height={70} />
              <ShimmerBlock height={46} radius={12} />
            </Card>
          </>
        ) : (
          <>
            <Card style={styles.profileCard}>
              <View style={styles.heroRow}>
                <Pressable onPress={onPickAvatar} style={styles.avatarWrap}>
                  {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} /> : <Ionicons name="person" size={40} color="#FF6A00" />}
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                </Pressable>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.posts}</Text>
                    <Text style={styles.statLabel}>posts</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.likes}</Text>
                    <Text style={styles.statLabel}>likes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.comments}</Text>
                    <Text style={styles.statLabel}>coment.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.bioBlock}>
                <Text style={styles.displayName}>{displayName || "Sin nombre"}</Text>
                <Text style={styles.username}>@{profile.username ?? "rider"}</Text>
                {bio ? <Text style={styles.bio}>{bio}</Text> : null}
                {homeCity ? <Text style={styles.city}>{homeCity}</Text> : null}
              </View>

              <View style={styles.profileActions}>
                <AppButton label={editing ? "Ocultar edicion" : "Editar perfil"} onPress={() => setEditing((current) => !current)} variant="secondary" />
                <AppButton label={uploadingAvatar ? "Subiendo avatar..." : "Cambiar foto"} onPress={onPickAvatar} disabled={uploadingAvatar} />
              </View>
            </Card>

            {editing ? (
              <Card style={styles.formCard}>
                <LabeledInput label="@ Username" value={username} onChangeText={setUsername} />
                <LabeledInput label="Nombre visible" value={displayName} onChangeText={setDisplayName} />
                <LabeledInput label="Ciudad" value={homeCity} onChangeText={setHomeCity} />
                <LabeledInput label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
                <AppButton label="Guardar cambios" onPress={onSave} loading={saving} />
                <AppButton label="Cerrar sesion" variant="danger" onPress={onSignOut} loading={signingOut} />
              </Card>
            ) : null}

            <Card style={styles.postsCard}>
              <View style={styles.postsHead}>
                <Ionicons name="grid-outline" size={16} color="#111827" />
                <Text style={styles.postsTitle}>Publicaciones</Text>
              </View>

              {loadingPosts ? (
                <Text style={styles.postsEmpty}>Cargando...</Text>
              ) : posts.length === 0 ? (
                <Text style={styles.postsEmpty}>Aun no has publicado nada.</Text>
              ) : (
                <View style={styles.postsGrid}>
                  {posts.map((post) => {
                    const firstMedia = post.post_media?.[0];
                    return (
                      <View key={post.id} style={styles.postTile}>
                        {firstMedia?.media_type === "image" ? (
                          <Image source={{ uri: firstMedia.media_url }} style={styles.postTileImage} />
                        ) : (
                          <View style={styles.postTileVideo}>
                            <Ionicons name="videocam" size={18} color="#FF6A00" />
                          </View>
                        )}
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
    paddingBottom: 120
  },
  profileCard: {
    gap: 12
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFD4BD",
    backgroundColor: "#FFF4EC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  avatarEditBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#FF6A00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around"
  },
  statItem: {
    alignItems: "center",
    gap: 2
  },
  statNumber: {
    color: "#111827",
    fontSize: 24
  },
  statLabel: {
    color: "#6B7280",
    fontSize: 11
  },
  bioBlock: {
    gap: 3
  },
  displayName: {
    color: "#111827",
    fontSize: 17
  },
  username: {
    color: "#4B5563",
    fontSize: 13
  },
  bio: {
    color: "#111827",
    fontSize: 13
  },
  city: {
    color: "#6B7280",
    fontSize: 12
  },
  profileActions: {
    gap: 8
  },
  formCard: {
    gap: 10
  },
  postsCard: {
    gap: 10
  },
  postsHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  postsTitle: {
    color: "#111827",
    fontSize: 16
  },
  postsEmpty: {
    color: "#6B7280",
    fontSize: 13
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  postTile: {
    width: "31.9%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6"
  },
  postTileImage: {
    width: "100%",
    height: "100%"
  },
  postTileVideo: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4EC"
  }
});
