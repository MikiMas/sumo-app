import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";
import { Database } from "@/types/db";

type RouteInsert = Database["public"]["Tables"]["routes"]["Insert"];
type RouteRow = Database["public"]["Tables"]["routes"]["Row"];
type RoutePointRow = Database["public"]["Tables"]["route_points"]["Row"];

export type RouteItem = RouteRow & {
  profiles?: {
    username: string;
  } | null;
};

export type RoutePoint = Pick<RoutePointRow, "id" | "route_id" | "point_order" | "lat" | "lng">;
export type LatLngPoint = { lat: number; lng: number };
export type SpotPresenceMember = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bike_id: string | null;
  bike_brand: string | null;
  bike_model: string | null;
  bike_nickname: string | null;
  checked_in_at: string;
};

export type SpotPresence = {
  route_id: string;
  count: number;
  members: SpotPresenceMember[];
};
export type RouteMedia = {
  id: string;
  route_id: string;
  uploaded_by: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  profiles?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type RoutePlan = {
  id: string;
  route_id: string;
  user_id: string;
  planned_at: string;
  note: string | null;
  status: string;
  profiles?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type HomeStats = {
  myBikes: number;
  publicRoutes: number;
  activeSessions: number;
};

export async function fetchRoutes() {
  const response = await apiRequest<{ ok: boolean; routes: RouteItem[] }>("/api/sumo/routes");
  return response.routes ?? [];
}

export async function fetchRouteById(routeId: string) {
  const response = await apiRequest<{ ok: boolean; route: RouteItem }>(`/api/sumo/routes/${routeId}`);
  return response.route;
}

export async function fetchRoutePoints(routeId: string) {
  const response = await apiRequest<{ ok: boolean; points: RoutePoint[] }>(`/api/sumo/routes/${routeId}/points`);
  return response.points ?? [];
}

export async function createRoute(payload: Omit<RouteInsert, "created_by">, _userId: string) {
  const response = await apiRequest<{ ok: boolean; route: RouteRow }>("/api/sumo/routes", {
    method: "POST",
    auth: true,
    body: payload
  });

  return response.route;
}

export async function replaceRoutePoints(routeId: string, points: { lat: number; lng: number }[]) {
  await apiRequest<{ ok: boolean; count: number }>(`/api/sumo/routes/${routeId}/points`, {
    method: "PUT",
    auth: true,
    body: {
      points
    }
  });
}

async function snapTraceWithApi(points: LatLngPoint[], stepsPerSegment = 20): Promise<LatLngPoint[]> {
  if (!env.apiBaseUrl) {
    throw new Error("Falta EXPO_PUBLIC_API_URL en el entorno.");
  }

  const endpoint = `${env.apiBaseUrl}/api/sumo/roads/snap`;
  console.log("[SUMO SNAP] POST", endpoint, { inputPoints: points.length });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points,
        steps_per_segment: stepsPerSegment,
        dedupe_epsilon: 0.00001
      }),
      signal: controller.signal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("abort")) {
      throw new Error("SUMO_API_SNAP_TIMEOUT");
    }
    throw new Error(`SUMO_API_SNAP_NETWORK_ERROR: ${message}`);
  } finally {
    clearTimeout(timeout);
  }

  console.log("[SUMO SNAP] STATUS", response.status);

  if (!response.ok) {
    throw new Error(`SUMO_API_SNAP_HTTP_${response.status}`);
  }

  const json = (await response.json()) as {
    ok?: boolean;
    points?: LatLngPoint[];
    error?: string;
  };

  if (!json.ok || !json.points || json.points.length < 2) {
    throw new Error(json.error ?? "SUMO_API_SNAP_INVALID_RESPONSE");
  }

  console.log("[SUMO SNAP] OK", { outputPoints: json.points.length });
  return json.points;
}

export async function buildRoadSnappedPolyline(points: LatLngPoint[]) {
  if (points.length < 2) {
    return points;
  }
  return snapTraceWithApi(points, 20);
}

export async function fetchHomeStats() {
  const response = await apiRequest<{ ok: boolean; stats: HomeStats }>("/api/sumo/stats/home", {
    auth: true
  });

  return response.stats;
}

export async function fetchRoutePresence(routeId: string): Promise<SpotPresence> {
  const response = await apiRequest<{ ok: boolean; presence: SpotPresence }>(`/api/sumo/routes/${routeId}/presence`);
  return response.presence;
}

export async function checkInRoutePresence(routeId: string, bikeId?: string | null) {
  await apiRequest<{ ok: boolean }>(`/api/sumo/routes/${routeId}/presence/check-in`, {
    method: "POST",
    auth: true,
    body: {
      bike_id: bikeId ?? null
    }
  });
}

export async function fetchRouteMedia(routeId: string) {
  const response = await apiRequest<{ ok: boolean; media: RouteMedia[] }>(`/api/sumo/routes/${routeId}/media`);
  return response.media ?? [];
}

export async function addRouteMedia(routeId: string, mediaUrl: string, caption?: string | null) {
  const response = await apiRequest<{ ok: boolean; media: RouteMedia }>(`/api/sumo/routes/${routeId}/media`, {
    method: "POST",
    auth: true,
    body: {
      media_url: mediaUrl,
      caption: caption ?? null
    }
  });
  return response.media;
}

export async function fetchRoutePlans(routeId: string) {
  const response = await apiRequest<{ ok: boolean; plans: RoutePlan[] }>(`/api/sumo/routes/${routeId}/plans`);
  return response.plans ?? [];
}

export async function addRoutePlan(routeId: string, plannedAtIso: string, note?: string | null) {
  const response = await apiRequest<{ ok: boolean; plan: RoutePlan }>(`/api/sumo/routes/${routeId}/plans`, {
    method: "POST",
    auth: true,
    body: {
      planned_at: plannedAtIso,
      note: note ?? null
    }
  });
  return response.plan;
}
