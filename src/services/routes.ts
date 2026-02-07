import { supabase } from "@/lib/supabase";
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

export async function fetchRoutes() {
  const { data, error } = await supabase
    .from("routes")
    .select("*, profiles!routes_created_by_fkey(username)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as RouteItem[];
}

export async function fetchRouteById(routeId: string) {
  const { data, error } = await supabase
    .from("routes")
    .select("*, profiles!routes_created_by_fkey(username)")
    .eq("id", routeId)
    .single();

  if (error) {
    throw error;
  }

  return data as RouteItem;
}

export async function fetchRoutePoints(routeId: string) {
  const { data, error } = await supabase
    .from("route_points")
    .select("id, route_id, point_order, lat, lng")
    .eq("route_id", routeId)
    .order("point_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as RoutePoint[];
}

export async function createRoute(payload: Omit<RouteInsert, "created_by">, userId: string) {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      ...payload,
      created_by: userId
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function replaceRoutePoints(routeId: string, points: { lat: number; lng: number }[]) {
  const { error: deleteError } = await supabase.from("route_points").delete().eq("route_id", routeId);
  if (deleteError) {
    throw deleteError;
  }

  if (points.length === 0) {
    return;
  }

  const payload = points.map((point, index) => ({
    route_id: routeId,
    point_order: index,
    lat: point.lat,
    lng: point.lng
  }));

  const { error: insertError } = await supabase.from("route_points").insert(payload);
  if (insertError) {
    throw insertError;
  }
}

async function snapPointToNearestRoad(point: LatLngPoint): Promise<LatLngPoint> {
  const url = `https://router.project-osrm.org/nearest/v1/driving/${point.lng},${point.lat}?number=1`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM error (${response.status})`);
  }

  const json = (await response.json()) as {
    waypoints?: {
      location?: number[];
    }[];
  };

  const location = json.waypoints?.[0]?.location;
  if (!location || location.length < 2) {
    throw new Error("No se pudo ajustar el punto a carretera.");
  }

  return { lng: location[0], lat: location[1] };
}

function densifyStraightSegments(points: LatLngPoint[], stepsPerSegment = 12): LatLngPoint[] {
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

function dedupeNearPoints(points: LatLngPoint[], epsilon = 0.00001): LatLngPoint[] {
  if (points.length === 0) {
    return points;
  }

  const result: LatLngPoint[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const prev = result[result.length - 1];
    const curr = points[index];
    const latDiff = Math.abs(curr.lat - prev.lat);
    const lngDiff = Math.abs(curr.lng - prev.lng);
    if (latDiff > epsilon || lngDiff > epsilon) {
      result.push(curr);
    }
  }
  return result;
}

export async function buildRoadSnappedPolyline(points: LatLngPoint[]) {
  if (points.length < 2) {
    return points;
  }

  // Densificamos primero para que el ajuste siga la forma de la carretera,
  // pero manteniendo el orden exacto definido por el usuario.
  const denseInput = densifyStraightSegments(points, 30);

  const snappedPoints: LatLngPoint[] = [];
  for (const point of denseInput) {
    try {
      const snapped = await snapPointToNearestRoad(point);
      snappedPoints.push(snapped);
    } catch {
      // Si falla el ajuste de un punto, mantenemos el original para no romper el trazado manual.
      snappedPoints.push(point);
    }
  }

  // Trazado estricto por el orden de puntos definido por el usuario.
  return dedupeNearPoints(snappedPoints);
}

export async function fetchMyActiveSession(routeId: string, userId: string) {
  const { data, error } = await supabase
    .from("route_sessions")
    .select("*")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SessionRow | null;
}

export async function startRouteSession(routeId: string, userId: string, isLocationShared: boolean) {
  const { data, error } = await supabase
    .from("route_sessions")
    .insert({
      route_id: routeId,
      user_id: userId,
      status: "active",
      is_location_shared: isLocationShared
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SessionRow;
}

export async function stopRouteSession(sessionId: string) {
  const { error } = await supabase
    .from("route_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
}

type TickPayload = {
  sessionId: string;
  lat: number;
  lng: number;
  speedMps?: number | null;
  headingDeg?: number | null;
  accuracyM?: number | null;
};

export async function sendLocationTick(input: TickPayload) {
  const { error } = await supabase.from("session_locations").insert({
    session_id: input.sessionId,
    lat: input.lat,
    lng: input.lng,
    speed_mps: input.speedMps ?? null,
    heading_deg: input.headingDeg ?? null,
    accuracy_m: input.accuracyM ?? null,
    captured_at: new Date().toISOString()
  });

  if (error) {
    throw error;
  }
}

export async function fetchActiveRiders(routeId: string) {
  const { data, error } = await supabase
    .from("route_sessions")
    .select("id, user_id, last_lat, last_lng, last_seen_at, is_location_shared, status, profiles!route_sessions_user_id_fkey(username)")
    .eq("route_id", routeId)
    .eq("status", "active")
    .eq("is_location_shared", true);

  if (error) {
    throw error;
  }

  return (data ?? []) as ActiveRider[];
}

export async function isNearRouteStart(routeId: string, lat: number, lng: number, radiusM = 500) {
  const { data, error } = await supabase.rpc("is_point_near_route_start", {
    p_route_id: routeId,
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}
