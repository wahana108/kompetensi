"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  clearAuthCookies,
  ensureUserProfile,
  registerWithEmail,
  setAuthCookies,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  toAuthSession,
} from "@/lib/auth/session";
import type { AuthSession, UserProfile } from "@/types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  session: AuthSession | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
  signInWithEmail: typeof signInWithEmail;
  signInWithGoogle: typeof signInWithGoogle;
  registerWithEmail: typeof registerWithEmail;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setError(null);

      if (!nextUser) {
        setUser(null);
        setProfile(null);
        clearAuthCookies();
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setLoading(true);

      try {
        const nextProfile = await ensureUserProfile(nextUser);
        setProfile(nextProfile);
        setAuthCookies(nextProfile.role);
      } catch (profileError) {
        setProfile(null);
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Gagal memuat profil pengguna."
        );
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [configured]);

  const handleSignOut = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
    setProfile(null);
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session: toAuthSession(profile),
      loading,
      configured,
      error,
      signInWithEmail,
      signInWithGoogle,
      registerWithEmail,
      signOut: handleSignOut,
    }),
    [configured, error, handleSignOut, loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }
  return context;
}
