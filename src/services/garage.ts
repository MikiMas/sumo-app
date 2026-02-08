import { apiRequest } from "@/lib/api";
import { Database } from "@/types/db";

type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];
type BikeInsert = Database["public"]["Tables"]["bikes"]["Insert"];
type BikeModInsert = Database["public"]["Tables"]["bike_mods"]["Insert"];
type BikeModRow = Database["public"]["Tables"]["bike_mods"]["Row"];
type BikeMediaRow = {
  id: string;
  bike_id: string;
  uploaded_by: string;
  media_url: string;
  caption: string | null;
  created_at: string;
};

export type GarageBike = BikeRow & {
  bike_mods: BikeModRow[];
  bike_media?: BikeMediaRow[];
};

export async function fetchGarage(_userId: string) {
  const response = await apiRequest<{ ok: boolean; bikes: GarageBike[] }>("/api/sumo/garage", {
    auth: true
  });

  return response.bikes ?? [];
}

export async function createBike(input: Omit<BikeInsert, "owner_id">, _ownerId: string) {
  const response = await apiRequest<{ ok: boolean; bike: BikeRow }>("/api/sumo/garage", {
    method: "POST",
    auth: true,
    body: input
  });

  return response.bike;
}

export async function addBikeMod(input: Omit<BikeModInsert, "category"> & { category?: string }) {
  const response = await apiRequest<{ ok: boolean; mod: BikeModRow }>("/api/sumo/garage/mods", {
    method: "POST",
    auth: true,
    body: {
      bike_id: input.bike_id,
      name: input.name,
      notes: input.notes ?? null,
      category: input.category ?? "general"
    }
  });

  return response.mod;
}

export async function fetchBikeMedia(bikeId: string) {
  const response = await apiRequest<{ ok: boolean; media: BikeMediaRow[] }>(`/api/sumo/garage/${bikeId}/media`, {
    auth: true
  });
  return response.media ?? [];
}

export async function addBikeMedia(bikeId: string, mediaUrl: string, caption?: string | null) {
  const response = await apiRequest<{ ok: boolean; media: BikeMediaRow }>(`/api/sumo/garage/${bikeId}/media`, {
    method: "POST",
    auth: true,
    body: {
      media_url: mediaUrl,
      caption: caption ?? null
    }
  });
  return response.media;
}
