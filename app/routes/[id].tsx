import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { Card, Screen, ShimmerBlock, ShimmerCard } from "@/components/ui";
import { FeedPost, fetchRoutePosts } from "@/services/feed";
import {
  RouteItem,
  SpotPresenceMember,
  addRoutePlan,
  checkInRoutePresence,
  fetchRouteById,
  fetchRoutePresence
} from "@/services/routes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH - 60;

export default function RouteDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [route, setRoute] = useState<RouteItem | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [presenceMembers, setPresenceMembers] = useState<SpotPresenceMember[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const mediaPosts = useMemo(
    () =>
      posts.filter((post) => {
        const sortedMedia = [...(post.post_media ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return sortedMedia.length > 0;
      }),
    [posts]
  );

  const loadPresence = useCallback(async () => {
    if (!routeId) {
      return;
    }

    setLoadingPresence(true);
    try {
      const presence = await fetchRoutePresence(routeId);
      setPresenceCount(presence.count ?? 0);
      setPresenceMembers(presence.members ?? []);
    } catch (error) {
      Alert.alert("No se pudo cargar presencia", String(error));
      setPresenceCount(0);
      setPresenceMembers([]);
    } finally {
      setLoadingPresence(false);
    }
  }, [routeId]);

  const loadSpotData = useCallback(async () => {
    if (!routeId) {
      return;
    }

    setLoading(true);
    try {
      const [routeData, postsData, presenceData] = await Promise.all([
        fetchRouteById(routeId),
        fetchRoutePosts(routeId, 50, 0),
        fetchRoutePresence(routeId)
      ]);

      setRoute(routeData);
      setPosts(postsData);
      setPresenceCount(presenceData.count ?? 0);
      setPresenceMembers(presenceData.members ?? []);
      setActiveSlide(0);
    } catch (error) {
      Alert.alert("Error cargando spot", String(error));
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadSpotData();
  }, [loadSpotData]);

  const onCheckIn = async () => {
    if (!routeId || checkingIn) {
      return;
    }

    setCheckingIn(true);
    try {
      await checkInRoutePresence(routeId, null);
      await loadPresence();
      Alert.alert("Listo", "Ya estas en este spot.");
    } catch (error) {
      Alert.alert("No se pudo marcar presencia", String(error));
    } finally {
      setCheckingIn(false);
    }
  };

  const onAddPlan = async () => {
    if (!routeId || savingPlan) {
      return;
    }

    setSavingPlan(true);
    try {
      const plannedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await addRoutePlan(routeId, plannedAt, null);
      Alert.alert("Plan guardado", "Te hemos marcado como proximo en este spot.");
    } catch (error) {
      Alert.alert("No se pudo guardar el plan", String(error));
    } finally {
      setSavingPlan(false);
    }
  };

  const onOpenVideo = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("No se pudo abrir el video");
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: route?.title ?? "Spot" }} />

      <ScrollView contentContainerStyle={styles.container}>
        {loading || !route ? (
          <>
            <ShimmerCard />
            <Card style={styles.blockCard}>
              <ShimmerBlock height={18} width="40%" />
              <ShimmerBlock height={250} radius={12} />
            </Card>
            <ShimmerCard lines={4} />
          </>
        ) : (
          <>
            <Card style={styles.routeCard}>
              <Text style={styles.routeTitle}>{route.title}</Text>
            </Card>

            <Card style={styles.blockCard}>
              <Text style={styles.blockTitle}>Contenido del spot</Text>

              {mediaPosts.length === 0 ? (
                <Text style={styles.emptyText}>Aun no hay fotos ni videos en este spot.</Text>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CAROUSEL_ITEM_WIDTH + 12}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselContent}
                    onMomentumScrollEnd={(event) => {
                      const current = Math.round(event.nativeEvent.contentOffset.x / (CAROUSEL_ITEM_WIDTH + 12));
                      setActiveSlide(Math.max(0, Math.min(current, mediaPosts.length - 1)));
                    }}
                  >
                    {mediaPosts.map((post) => {
                      const sortedMedia = [...(post.post_media ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                      const media = sortedMedia[0];

                      return (
                        <View key={post.id} style={[styles.slide, { width: CAROUSEL_ITEM_WIDTH }]}> 
                          {media.media_type === "image" ? (
                            <Image source={{ uri: media.media_url }} style={styles.slideImage} />
                          ) : (
                            <Pressable style={styles.videoSlide} onPress={() => onOpenVideo(media.media_url)}>
                              <Ionicons name="videocam" size={20} color="#FF6A00" />
                              <Text style={styles.videoSlideText}>Video</Text>
                              <Text style={styles.videoSlideHint}>Pulsa para abrir</Text>
                            </Pressable>
                          )}

                          <View style={styles.slideMeta}>
                            <Text style={styles.slideAuthor}>@{post.profiles?.username ?? "rider"}</Text>
                            <Text style={styles.slideBody} numberOfLines={2}>
                              {post.body}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.dotsRow}>
                    {mediaPosts.map((post, index) => (
                      <View
                        key={`${post.id}-${index}`}
                        style={[styles.dot, index === activeSlide && styles.dotActive]}
                      />
                    ))}
                  </View>
                </>
              )}
            </Card>

            <Card style={styles.blockCard}>
              <View style={styles.presenceHeader}>
                <View style={styles.presenceInline}>
                  <Ionicons name="person" size={16} color="#111827" />
                  <Text style={styles.presenceCount}>{loadingPresence ? "..." : presenceCount}</Text>
                </View>
                <Pressable
                  style={styles.viewUsersBtn}
                  onPress={() => setMembersModalOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ver usuarios"
                >
                  <Ionicons name="eye-outline" size={18} color="#111827" />
                </Pressable>
              </View>
            </Card>

            <Card style={styles.blockCard}>
              <View style={styles.actionsWrap}>
                <Pressable
                  style={[styles.actionIconBtnDark, checkingIn && styles.actionIconBtnDisabled]}
                  onPress={onCheckIn}
                  disabled={checkingIn}
                  accessibilityRole="button"
                  accessibilityLabel="Estoy en este spot"
                >
                  <Ionicons name={checkingIn ? "hourglass-outline" : "location"} size={19} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={[styles.actionIconBtnLight, savingPlan && styles.actionIconBtnDisabled]}
                  onPress={onAddPlan}
                  disabled={savingPlan}
                  accessibilityRole="button"
                  accessibilityLabel="Voy a estar en este spot"
                >
                  <Ionicons name={savingPlan ? "hourglass-outline" : "time-outline"} size={19} color="#111827" />
                </Pressable>
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={membersModalOpen} transparent animationType="fade" onRequestClose={() => setMembersModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Usuarios</Text>
              <Pressable onPress={() => setMembersModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={16} color="#111827" />
              </Pressable>
            </View>

            {presenceMembers.length === 0 ? (
              <Text style={styles.emptyText}>Ahora mismo no hay usuarios activos.</Text>
            ) : (
              <ScrollView style={styles.membersList} contentContainerStyle={styles.membersListContent}>
                {presenceMembers.map((member) => (
                  <Pressable
                    key={`${member.user_id}-${member.checked_in_at}`}
                    style={styles.memberRow}
                    onPress={() => {
                      setMembersModalOpen(false);
                      router.push(`/profile/${member.user_id}`);
                    }}
                  >
                    {member.avatar_url ? (
                      <Image source={{ uri: member.avatar_url }} style={styles.memberAvatarImage} />
                    ) : (
                      <View style={styles.memberAvatar}>
                        <Ionicons name="person" size={15} color="#FF7A00" />
                      </View>
                    )}
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName}>
                        {member.display_name?.trim() || `@${member.username ?? "rider"}`}
                      </Text>
                      <View style={styles.memberBikeRow}>
                        <Ionicons name="bicycle-outline" size={12} color="#6B7280" />
                        <Text style={styles.memberBike}>{`${member.bike_brand ?? ""} ${member.bike_model ?? ""}`.trim() || "Sin moto"}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#6B7280" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingBottom: 26
  },
  routeCard: {
    gap: 6
  },
  routeTitle: {
    color: "#111827",
    fontSize: 24
  },
  blockCard: {
    gap: 10
  },
  blockTitle: {
    color: "#111827",
    fontSize: 17
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13
  },
  carouselContent: {
    gap: 12,
    paddingRight: 4
  },
  slide: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E8EE",
    backgroundColor: "#FFFFFF",
    overflow: "hidden"
  },
  slideImage: {
    width: "100%",
    height: 230,
    backgroundColor: "#EEF2F7"
  },
  videoSlide: {
    width: "100%",
    height: 230,
    backgroundColor: "#FFF4EC",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD9C4",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  videoSlideText: {
    color: "#FF6A00",
    fontSize: 14
  },
  videoSlideHint: {
    color: "#6B7280",
    fontSize: 12
  },
  slideMeta: {
    padding: 10,
    gap: 3
  },
  slideAuthor: {
    color: "#111827",
    fontSize: 13
  },
  slideBody: {
    color: "#4B5563",
    fontSize: 12
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#D1D5DB"
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FF6A00"
  },
  presenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  presenceInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0
  },
  presenceCount: {
    color: "#111827",
    fontSize: 17
  },
  viewUsersBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E4E8EE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  actionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
  },
  actionIconBtnDark: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center"
  },
  actionIconBtnLight: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E8EE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  actionIconBtnDisabled: {
    opacity: 0.55
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.36)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  modalCard: {
    width: "100%",
    maxHeight: "70%",
    gap: 10
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalTitle: {
    color: "#111827",
    fontSize: 18
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center"
  },
  membersList: {
    maxHeight: 360
  },
  membersListContent: {
    gap: 8,
    paddingBottom: 4
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE3EC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  memberAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDE3EC",
    backgroundColor: "#F7F9FC"
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22C55E",
    backgroundColor: "#0F1113",
    alignItems: "center",
    justifyContent: "center"
  },
  memberMeta: {
    flex: 1,
    gap: 4
  },
  memberName: {
    color: "#111827",
    fontSize: 16
  },
  memberBikeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  memberBike: {
    color: "#6B7280",
    fontSize: 12
  }
});
