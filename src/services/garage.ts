import { supabase } from "@/lib/supabase";
import { Database } from "@/types/db";

type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];
type BikeInsert = Database["public"]["Tables"]["bikes"]["Insert"];
type BikeModInsert = Database["public"]["Tables"]["bike_mods"]["Insert"];
type BikeModRow = Database["public"]["Tables"]["bike_mods"]["Row"];

export type GarageBike = BikeRow & {
  bike_mods: BikeModRow[];
};

export async function fetchGarage(userId: string) {
  const { data, error } = await supabase
    .from("bikes")
    .select("*, bike_mods(*)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as GarageBike[];
}

export async function createBike(input: Omit<BikeInsert, "owner_id">, ownerId: string) {
  const { data, error } = await supabase
    .from("bikes")
    .insert({
      ...input,
      owner_id: ownerId
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function addBikeMod(input: Omit<BikeModInsert, "category"> & { category?: string }) {
  const { data, error } = await supabase
    .from("bike_mods")
    .insert({
      bike_id: input.bike_id,
      name: input.name,
      notes: input.notes ?? null,
      category: input.category ?? "general"
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
