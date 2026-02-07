import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession,
  StoredAuthSession,
  StoredAuthUser
} from "@/lib/authStorage";
import { Database } from "@/types/db";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthContextValue = {
  session: StoredAuthSession | null;
  user: StoredAuthUser | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthPayload = {
  ok: boolean;
  user: StoredAuthUser;
  profile: Profile | null;
  session: {
    access_token: string;
    refresh_token?: string | null;
    expires_at?: number | null;
  };
};

type AuthMePayload = {
  ok: boolean;
  user: StoredAuthUser;
  profile: Profile | null;
};

type ProfilePayload = {
  ok: boolean;
  profile: Profile | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toStoredSession(payload: AuthPayload): StoredAuthSession {
  return {
    accessToken: payload.session.access_token,
    refreshToken: payload.session.refresh_token ?? null,
    expiresAt: payload.session.expires_at ?? null,
    user: payload.user
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [user, setUser] = useState<StoredAuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuthState = useCallback((nextSession: StoredAuthSession | null, nextProfile: Profile | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.accessToken) {
      setProfile(null);
      return;
    }

    try {
      const result = await apiRequest<ProfilePayload>("/api/sumo/profile/me", {
        auth: true,
        token: session.accessToken
      });
      setProfile(result.profile ?? null);
    } catch (error) {
      console.error("Error cargando profile:", error);
    }
  }, [session?.accessToken]);

  const bootstrap = useCallback(async () => {
    const stored = await getStoredAuthSession();
    if (!stored) {
      setAuthState(null, null);
      setLoading(false);
      return;
    }

    try {
      const result = await apiRequest<AuthMePayload>("/api/sumo/auth/me", {
        auth: true,
        token: stored.accessToken
      });

      const mergedSession: StoredAuthSession = {
        ...stored,
        user: result.user
      };

      await setStoredAuthSession(mergedSession);
      setAuthState(mergedSession, result.profile ?? null);
    } catch (error) {
      console.error("Sesion invalida. Limpiando credenciales locales:", error);
      await clearStoredAuthSession();
      setAuthState(null, null);
    } finally {
      setLoading(false);
    }
  }, [setAuthState]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<AuthPayload>("/api/sumo/auth/login", {
      method: "POST",
      body: {
        email,
        password
      }
    });

    const nextSession = toStoredSession(result);
    await setStoredAuthSession(nextSession);
    setAuthState(nextSession, result.profile ?? null);
  }, [setAuthState]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const result = await apiRequest<AuthPayload>("/api/sumo/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        username
      }
    });

    const nextSession = toStoredSession(result);
    await setStoredAuthSession(nextSession);
    setAuthState(nextSession, result.profile ?? null);
  }, [setAuthState]);

  const signOut = useCallback(async () => {
    try {
      if (session?.accessToken) {
        await apiRequest<{ ok: boolean }>("/api/sumo/auth/logout", {
          method: "POST",
          auth: true,
          token: session.accessToken
        });
      }
    } catch (error) {
      console.warn("No se pudo invalidar token en servidor, se cierra sesion local:", error);
    } finally {
      await clearStoredAuthSession();
      setAuthState(null, null);
    }
  }, [session?.accessToken, setAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      refreshProfile,
      signIn,
      signUp,
      signOut
    }),
    [loading, profile, refreshProfile, session, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }

  return context;
}
