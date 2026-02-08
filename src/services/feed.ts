import { apiRequest } from "@/lib/api";

export type FeedAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type FeedMedia = {
  id: string;
  post_id: string;
  media_type: "image" | "video";
  media_url: string;
  thumb_url: string | null;
  sort_order: number;
  created_at: string;
};

export type FeedPost = {
  id: string;
  author_id: string;
  body: string;
  route_id: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  profiles?: FeedAuthor | null;
  post_media: FeedMedia[];
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

export type FeedComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  profiles?: FeedAuthor | null;
};

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  home_city: string | null;
};

export async function fetchFeed(limit = 20, offset = 0) {
  const response = await apiRequest<{ ok: boolean; posts: FeedPost[] }>(`/api/sumo/feed?limit=${limit}&offset=${offset}`, {
    auth: true
  });
  return response.posts ?? [];
}

export async function createFeedPost(input: {
  body: string;
  route_id?: string | null;
  media?: Array<{ media_url: string; media_type?: "image" | "video"; thumb_url?: string | null; sort_order?: number }>;
}) {
  const response = await apiRequest<{ ok: boolean; post: FeedPost }>("/api/sumo/feed", {
    method: "POST",
    auth: true,
    body: input
  });
  return response.post;
}

export async function toggleFeedLike(postId: string) {
  const response = await apiRequest<{ ok: boolean; liked: boolean; likes_count: number }>(`/api/sumo/feed/${postId}/like`, {
    method: "POST",
    auth: true
  });
  return {
    liked: Boolean(response.liked),
    likes_count: Number(response.likes_count ?? 0)
  };
}

export async function fetchFeedComments(postId: string, limit = 100) {
  const response = await apiRequest<{ ok: boolean; comments: FeedComment[] }>(`/api/sumo/feed/${postId}/comments?limit=${limit}`, {
    auth: true
  });
  return response.comments ?? [];
}

export async function createFeedComment(postId: string, body: string, parent_comment_id?: string | null) {
  const response = await apiRequest<{ ok: boolean; comment: FeedComment }>(`/api/sumo/feed/${postId}/comments`, {
    method: "POST",
    auth: true,
    body: {
      body,
      parent_comment_id: parent_comment_id ?? null
    }
  });
  return response.comment;
}

export async function fetchProfilePosts(profileId: string, limit = 20, offset = 0) {
  const response = await apiRequest<{ ok: boolean; profile: PublicProfile; posts: FeedPost[] }>(
    `/api/sumo/profile/${profileId}/posts?limit=${limit}&offset=${offset}`,
    { auth: true }
  );
  return {
    profile: response.profile,
    posts: response.posts ?? []
  };
}
