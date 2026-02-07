import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";
import { Database } from "@/types/db";

type RouteInsert = Database["public"]["Tables"]["routes"]["Insert"];
type RouteRow = Database["public"]["Tables"]["routes"]["Row"];
type SessionRow = Database["public"]["Tables"]["route_sessions"]["Row"];
type RoutePointRow = Database["public"]["Tables"]["route_points"]["Row"];

export type RouteItem = RouteRow & {
  profiles?: {
    username: string;
  } | null;
};

export type ActiveRider = Pick<
  SessionRow,
  "id" | "user_id" | "last_lat" | "last_lng" | "last_seen_at" | "is_location_shared" | "status"
> & {
  profiles?: { username: string | null } | null;
};

export type RoutePoint = Pick<RoutePointRow, "id" | "route_id" | "point_order" | "lat" | "lng">;
export type LatLngPoint = { lat: number; lng: number };

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

function densifyStraightSegments(points: LatLngPoint[], stepsPerSegment = 30): LatLngPoint[] {
  if (points.length < 2) {
    return points;
  }

  const dense: LatLngPoint[] = [points[0]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      dense.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t
      });
    }
  }

  return dense;
}

async function snapTraceWithApi(points: LatLngPoint[]): Promise<LatLngPoint[]> {
  if (!env.apiBaseUrl) {
    throw new Error("Falta EXPO_PUBLIC_API_URL en el entorno.");
  }

  const endpoint = `${env.apiBaseUrl}/api/sumo/roads/snap`;
  console.log("[SUMO SNAP] POST", endpoint, { inputPoints: points.length });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      points,
      steps_per_segment: 1,
      dedupe_epsilon: 0.00001
    })
  });

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

  const denseInput = densifyStraightSegments(points, 30);

  try {
    return await snapTraceWithApi(denseInput);
  } catch (error) {
    console.error("No se pudo ajustar con API, se usa trazado manual:", error);
    return denseInput;
  }
}

export async function fetchMyActiveSession(routeId: string, _userId: string) {
  const response = await apiRequest<{ ok: boolean; session: SessionRow | null }>(`/api/sumo/routes/${routeId}/session`, {
    auth: true
  });

  return response.session;
}

export async function startRouteSession(routeId: string, _userId: string, isLocationShared: boolean) {
  const response = await apiRequest<{ ok: boolean; session: SessionRow }>(`/api/sumo/routes/${routeId}/session/start`, {
    method: "POST",
    auth: true,
    body: {
      is_location_shared: isLocationShared
    }
  });

  return response.session;
}

export async function stopRouteSession(routeId: string, sessionId: string) {
  await apiRequest<{ ok: boolean }>(`/api/sumo/routes/${routeId}/session/stop`, {
    method: "POST",
    auth: true,
    body: {
      session_id: sessionId
    }
  });
}

type TickPayload = {
  routeId: string;
  sessionId: string;
  lat: number;
  lng: number;
  speedMps?: number | null;
  headingDeg?: number | null;
  accuracyM?: number | null;
};

export async function sendLocationTick(input: TickPayload) {
  await apiRequest<{ ok: boolean }>(`/api/sumo/routes/${input.routeId}/session/tick`, {
    method: "POST",
    auth: true,
    body: {
      session_id: input.sessionId,
      lat: input.lat,
      lng: input.lng,
      speed_mps: input.speedMps ?? null,
      heading_deg: input.headingDeg ?? null,
      accuracy_m: input.accuracyM ?? null
    }
  });
}

export async function fetchActiveRiders(routeId: string) {
  const response = await apiRequest<{ ok: boolean; riders: ActiveRider[] }>(`/api/sumo/routes/${routeId}/riders`);
  return response.riders ?? [];
}

export async function isNearRouteStart(routeId: string, lat: number, lng: number, radiusM = 500) {
  const response = await apiRequest<{ ok: boolean; near: boolean }>(`/api/sumo/routes/${routeId}/near-start`, {
    method: "POST",
    body: {
      lat,
      lng,
      radius_m: radiusM
    }
  });

  return Boolean(response.near);
}

export async function fetchHomeStats() {
  const response = await apiRequest<{ ok: boolean; stats: HomeStats }>("/api/sumo/stats/home", {
    auth: true
  });

  return response.stats;
}
