import { apiRequest } from "@/lib/api";
import { Database } from "@/types/db";

type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];
type BikeInsert = Database["public"]["Tables"]["bikes"]["Insert"];
export type BikeMediaRow = {
  id: string;
  bike_id: string;
  uploaded_by: string;
  media_url: string;
  caption: string | null;
  created_at: string;
};

export type GarageBike = BikeRow & {
  bike_media?: BikeMediaRow[];
};

export async function fetchGarage(_userId: string) {
  const response = await apiRequest<{ ok: boolean; bikes: GarageBike[] }>("/api/sumo/garage", {
    auth: true
  });

  return response.bikes ?? [];
}

export async function fetchProfileGarage(profileId: string) {
  const response = await apiRequest<{ ok: boolean; bikes: GarageBike[] }>(`/api/sumo/profile/${profileId}/garage`, {
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

export type UpdateGarageBikeInput = {
  brand?: string;
  model?: string;
  year?: number | null;
  nickname?: string | null;
  displacement_cc?: number | null;
  plate?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  is_public?: boolean;
};

export async function fetchGarageBike(bikeId: string) {
  const response = await apiRequest<{ ok: boolean; bike: GarageBike }>(`/api/sumo/garage/${bikeId}`, {
    auth: true
  });
  return response.bike;
}

export async function updateGarageBike(bikeId: string, input: UpdateGarageBikeInput) {
  const response = await apiRequest<{ ok: boolean; bike: GarageBike }>(`/api/sumo/garage/${bikeId}`, {
    method: "PATCH",
    auth: true,
    body: input
  });
  return response.bike;
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
