const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? apiBaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_API_URL en el entorno.");
}

if (!supabaseAnonKey) {
  throw new Error("Falta EXPO_PUBLIC_SUPABASE_ANON_KEY en el entorno.");
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  apiBaseUrl: apiBaseUrl ?? null
};
