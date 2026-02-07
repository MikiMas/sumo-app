const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const trackingIntervalRaw = process.env.EXPO_PUBLIC_TRACKING_INTERVAL_SECONDS;

if (!supabaseUrl) {
  throw new Error("Falta EXPO_PUBLIC_SUPABASE_URL en el entorno.");
}

if (!supabaseAnonKey) {
  throw new Error("Falta EXPO_PUBLIC_SUPABASE_ANON_KEY en el entorno.");
}

const parsedTrackingInterval = Number(trackingIntervalRaw ?? 7);

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  trackingIntervalMs:
    Number.isFinite(parsedTrackingInterval) && parsedTrackingInterval > 0
      ? parsedTrackingInterval * 1000
      : 7000
};
