import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, Screen, ShimmerCard } from "@/components/ui";
import { FeedComment, FeedPost, fetchFeed, fetchFeedComments, toggleFeedLike, createFeedComment } from "@/services/feed";

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ahora";
  return date.toLocaleString();
}

export default function HomeScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<string, string>>({});
  const [sendingCommentFor, setSendingCommentFor] = useState<string | null>(null);

  const storyAuthors = useMemo(() => {
    const map = new Map<string, FeedPost["profiles"]>();
    for (const post of posts) {
      if (post.profiles?.id && !map.has(post.profiles.id)) {
        map.set(post.profiles.id, post.profiles);
      }
    }
    return Array.from(map.values()).slice(0, 12);
  }, [posts]);

  const loadFeed = useCallback(async (withSpinner = true) => {
    if (withSpinner) {
      setFeedLoading(true);
    }
    try {
      const next = await fetchFeed(30, 0);
      setPosts(next);
    } catch (error) {
      Alert.alert("Error", `No se pudo cargar el feed: ${String(error)}`);
    } finally {
      if (withSpinner) {
        setFeedLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFeed(true);
  }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed(false);
    setRefreshing(false);
  }, [loadFeed]);

  const onToggleLike = async (postId: string) => {
    const current = posts.find((item) => item.id === postId);
    if (!current) return;

    const optimisticLiked = !current.liked_by_me;
    const optimisticLikes = Math.max(0, current.likes_count + (optimisticLiked ? 1 : -1));

    setPosts((items) =>
      items.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked_by_me: optimisticLiked,
              likes_count: optimisticLikes
            }
          : post
      )
    );

    try {
      const result = await toggleFeedLike(postId);
      setPosts((items) =>
        items.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked_by_me: result.liked,
                likes_count: result.likes_count
              }
            : post
        )
      );
    } catch (error) {
      setPosts((items) =>
        items.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked_by_me: current.liked_by_me,
                likes_count: current.likes_count
              }
            : post
        )
      );
      Alert.alert("No se pudo dar like", String(error));
    }
  };

  const onToggleComments = async (postId: string) => {
    const willOpen = !commentsOpen[postId];
    setCommentsOpen((current) => ({ ...current, [postId]: willOpen }));

    if (!willOpen || commentsByPost[postId]) {
      return;
    }

    try {
      const comments = await fetchFeedComments(postId, 100);
      setCommentsByPost((current) => ({ ...current, [postId]: comments }));
    } catch (error) {
      Alert.alert("No se pudieron cargar comentarios", String(error));
    }
  };

  const onSendComment = async (postId: string) => {
    const text = (commentDraftByPost[postId] ?? "").trim();
    if (!text || sendingCommentFor) return;

    setSendingCommentFor(postId);
    try {
      const comment = await createFeedComment(postId, text);
      setCommentsByPost((current) => ({ ...current, [postId]: [...(current[postId] ?? []), comment] }));
      setCommentDraftByPost((current) => ({ ...current, [postId]: "" }));
      setPosts((items) =>
        items.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments_count: post.comments_count + 1
              }
            : post
        )
      );
    } catch (error) {
      Alert.alert("No se pudo comentar", String(error));
    } finally {
      setSendingCommentFor(null);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6A00" />}
        showsVerticalScrollIndicator={false}
      >

        {feedLoading ? (
          <>
            <ShimmerCard lines={4} />
            <ShimmerCard lines={5} />
          </>
        ) : posts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin publicaciones aun</Text>
            <Text style={styles.emptyText}>Pulsa el + del centro para crear tu primera publicacion.</Text>
          </Card>
        ) : (
          posts.map((post) => {
            const author = post.profiles;
            const comments = commentsByPost[post.id] ?? [];
            const isCommentsOpen = Boolean(commentsOpen[post.id]);
            const firstMedia = post.post_media[0];

            return (
              <Card key={post.id} style={styles.postCard}>
                <Pressable
                  style={styles.postHead}
                  onPress={() => {
                    if (author?.id) {
                      router.push(`/profile/${author.id}`);
                    }
                  }}
                >
                  <View style={styles.avatarWrap}>
                    {author?.avatar_url ? <Image source={{ uri: author.avatar_url }} style={styles.avatar} /> : <Text style={styles.avatarFallback}>{(author?.username ?? "r").slice(0, 1)}</Text>}
                  </View>
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>@{author?.username ?? "rider"}</Text>
                    <Text style={styles.postTime}>{fmtDate(post.created_at)}</Text>
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
                </Pressable>

                {firstMedia ? (
                  firstMedia.media_type === "image" ? (
                    <Image source={{ uri: firstMedia.media_url }} style={styles.postImage} />
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Ionicons name="videocam" size={20} color="#FF6A00" />
                      <Text style={styles.videoPlaceholderText}>Video publicado</Text>
                      <Link href={firstMedia.media_url} style={styles.videoLink}>
                        Abrir video
                      </Link>
                    </View>
                  )
                ) : null}

                <View style={styles.postActions}>
                  <Pressable style={styles.postActionBtn} onPress={() => onToggleLike(post.id)}>
                    <Ionicons name={post.liked_by_me ? "heart" : "heart-outline"} size={22} color={post.liked_by_me ? "#EF4444" : "#111827"} />
                  </Pressable>
                  <Pressable style={styles.postActionBtn} onPress={() => onToggleComments(post.id)}>
                    <Ionicons name="chatbubble-outline" size={20} color="#111827" />
                  </Pressable>
                  <Pressable style={styles.postActionBtn}>
                    <Ionicons name="paper-plane-outline" size={20} color="#111827" />
                  </Pressable>
                </View>

                <Text style={styles.likesText}>{post.likes_count} likes</Text>
                <Text style={styles.captionText}>
                  <Text style={styles.captionAuthor}>@{author?.username ?? "rider"}</Text> {post.body}
                </Text>
                <Pressable onPress={() => onToggleComments(post.id)}>
                  <Text style={styles.viewCommentsText}>
                    {post.comments_count > 0 ? `Ver ${post.comments_count} comentarios` : "Comenta esta publicacion"}
                  </Text>
                </Pressable>

                {isCommentsOpen ? (
                  <View style={styles.commentsWrap}>
                    {comments.map((comment) => (
                      <View key={comment.id} style={styles.commentRow}>
                        <Text style={styles.commentAuthor}>@{comment.profiles?.username ?? "rider"}</Text>
                        <Text style={styles.commentBody}>{comment.body}</Text>
                      </View>
                    ))}

                    <View style={styles.commentComposer}>
                      <TextInput
                        value={commentDraftByPost[post.id] ?? ""}
                        onChangeText={(value) => setCommentDraftByPost((current) => ({ ...current, [post.id]: value }))}
                        placeholder="Anade un comentario..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.commentInput}
                      />
                      <Pressable style={styles.commentSendBtn} onPress={() => onSendComment(post.id)} disabled={sendingCommentFor === post.id}>
                        <Ionicons name="send" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })
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
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2
  },
  feedTitle: {
    color: "#111827",
    fontSize: 30
  },
  feedHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center"
  },
  storyCard: {
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  storyRow: {
    gap: 10,
    paddingHorizontal: 2
  },
  storyItem: {
    width: 76,
    alignItems: "center",
    gap: 6
  },
  storyAvatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 999,
    padding: 2,
    backgroundColor: "#FF6A00"
  },
  storyAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  storyAvatarImage: {
    width: "100%",
    height: "100%"
  },
  storyFallback: {
    color: "#111827",
    fontSize: 16
  },
  storyName: {
    color: "#374151",
    fontSize: 11
  },
  emptyCard: {
    gap: 4
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 20
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13
  },
  postCard: {
    gap: 8,
    padding: 10
  },
  postHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    color: "#111827",
    fontSize: 14
  },
  postMeta: {
    flex: 1,
    gap: 1
  },
  postAuthor: {
    color: "#111827",
    fontSize: 13
  },
  postTime: {
    color: "#6B7280",
    fontSize: 11
  },
  postImage: {
    width: "100%",
    height: 300,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6"
  },
  videoPlaceholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFE0CC",
    backgroundColor: "#FFF4EC",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  videoPlaceholderText: {
    color: "#FF6A00",
    fontSize: 13
  },
  videoLink: {
    color: "#111827",
    fontSize: 12,
    textDecorationLine: "underline"
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 2
  },
  postActionBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  likesText: {
    color: "#111827",
    fontSize: 13
  },
  captionText: {
    color: "#111827",
    fontSize: 13,
    lineHeight: 18
  },
  captionAuthor: {
    color: "#111827",
    fontSize: 13
  },
  viewCommentsText: {
    color: "#6B7280",
    fontSize: 12
  },
  commentsWrap: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    paddingTop: 8
  },
  commentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  commentAuthor: {
    color: "#111827",
    fontSize: 12
  },
  commentBody: {
    color: "#374151",
    fontSize: 12
  },
  commentComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12
  },
  commentSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#FF6A00",
    alignItems: "center",
    justifyContent: "center"
  }
});
