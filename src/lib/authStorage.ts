import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "sumo.auth.session.v1";

export type StoredAuthUser = {
  id: string;
  email: string | null;
};

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: StoredAuthUser;
};

export async function getStoredAuthSession(): Promise<StoredAuthSession | null> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed?.accessToken || !parsed?.user?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getStoredAccessToken(): Promise<string | null> {
  const session = await getStoredAuthSession();
  return session?.accessToken ?? null;
}

export async function setStoredAuthSession(session: StoredAuthSession): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}
