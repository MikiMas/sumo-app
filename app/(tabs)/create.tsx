import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, Card, Screen } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { createFeedPost } from "@/services/feed";
import { uploadImageFromUriRaw } from "@/services/media";

function inferMediaType(uri: string, pickerType?: string | null): "image" | "video" {
  if (pickerType === "video") return "video";
  const lower = uri.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".m4v")) return "video";
  return "image";
}

export default function CreatePostScreen() {
  const { session } = useAuth();
  const [draftPost, setDraftPost] = useState("");
  const [sendingPost, setSendingPost] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaDraft, setMediaDraft] = useState<Array<{ media_url: string; media_type: "image" | "video" }>>([]);

  const onPickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitas dar permiso para abrir la galeria.");
      return;
    }

    if (!session?.accessToken) {
      Alert.alert("Sesion", "Inicia sesion de nuevo para subir archivo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.85
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    const mediaType = inferMediaType(asset.uri, asset.type ?? null);

    setUploadingMedia(true);
    try {
      const publicUrl = await uploadImageFromUriRaw(asset.uri, "post-media", session.accessToken);
      setMediaDraft((current) => [...current, { media_url: publicUrl, media_type: mediaType }]);
    } catch (error) {
      Alert.alert("No se pudo subir archivo", String(error));
    } finally {
      setUploadingMedia(false);
    }
  };

  const onCreatePost = async () => {
    const body = draftPost.trim();
    if (!body) {
      Alert.alert("Falta texto", "Escribe un pie de foto o descripcion.");
      return;
    }

    setSendingPost(true);
    try {
      await createFeedPost({
        body,
        media: mediaDraft.map((item, index) => ({
          media_url: item.media_url,
          media_type: item.media_type,
          sort_order: index
        }))
      });

      Alert.alert("Publicado", "Tu publicacion ya esta en el feed.");
      setDraftPost("");
      setMediaDraft([]);
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("No se pudo publicar", String(error));
    } finally {
      setSendingPost(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card style={styles.composerCard}>
          <Text style={styles.title}>Crear publicacion</Text>
          <Text style={styles.subtitle}>Comparte foto o video como en Instagram.</Text>

          <TextInput
            value={draftPost}
            onChangeText={setDraftPost}
            placeholder="Escribe el pie de foto..."
            placeholderTextColor="#9CA3AF"
            multiline
            style={styles.input}
          />

          {mediaDraft.length > 0 ? (
            <View style={styles.previewGrid}>
              {mediaDraft.map((media, index) => (
                <View key={`${media.media_url}-${index}`} style={styles.previewCard}>
                  {media.media_type === "image" ? (
                    <Image source={{ uri: media.media_url }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.previewVideo}>
                      <Ionicons name="videocam" size={18} color="#FF6A00" />
                      <Text style={styles.previewVideoText}>Video</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => setMediaDraft((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <AppButton
              label={uploadingMedia ? "Subiendo..." : "Agregar foto/video"}
              onPress={onPickMedia}
              disabled={uploadingMedia || sendingPost}
              variant="secondary"
            />
            <AppButton label={sendingPost ? "Publicando..." : "Publicar"} onPress={onCreatePost} disabled={sendingPost || uploadingMedia} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 120
  },
  composerCard: {
    gap: 12
  },
  title: {
    color: "#111827",
    fontSize: 26
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  previewCard: {
    width: "48%",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8DEE8",
    backgroundColor: "#F9FAFB",
    position: "relative"
  },
  previewImage: {
    width: "100%",
    height: 140
  },
  previewVideo: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  previewVideoText: {
    color: "#FF6A00",
    fontSize: 12
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center"
  },
  actions: {
    gap: 8
  }
});
