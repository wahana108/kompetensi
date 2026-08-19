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
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getClientAuth, getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { mapUserProfile } from "@/lib/auth/user-profile";
import {
  clearAuthCookies,
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
  /**
   * Dari Firebase Auth `User.emailVerified` (bukan field Firestore).
   * Selalu true untuk akun Google. Dipakai AuthGate menggerbang
   * /verifikasi-email — lihat guards.ts.
   */
  emailVerified: boolean;
  loading: boolean;
  configured: boolean;
  error: string | null;
  signInWithEmail: typeof signInWithEmail;
  signInWithGoogle: typeof signInWithGoogle;
  registerWithEmail: typeof registerWithEmail;
  /**
   * Firebase Auth TIDAK memantau perubahan emailVerified secara realtime
   * (beda tab/beda perangkat, klik tautan verifikasi tidak memicu event
   * apa pun di sesi ini) — harus diminta manual lewat User.reload().
   * Ini murni MEMBACA ulang status dari Auth SDK, tidak menulis apa pun
   * ke Firestore, jadi tidak menambah "penulis profil" baru.
   */
  refreshEmailVerification: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
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

    // Provider ini HANYA MEMBACA profil (lewat onSnapshot), tidak pernah
    // membuatnya. Pembuatan dokumen users/{uid} baru terjadi satu-satunya
    // di session.ts (registerWithEmail / signInWithGoogle) — kalau provider
    // ini juga membuat profil, dua penulis bisa balapan menulis dokumen
    // yang sama (itu yang menyebabkan bug sebelumnya: akun ter-rollback
    // meski registrasi sebenarnya sudah berhasil). onSnapshot otomatis
    // menangkap begitu dokumennya benar-benar dibuat oleh fungsi tsb,
    // jadi login Google pertama kali tetap jalan normal — provider tinggal
    // menunggu snapshot berikutnya, tidak perlu tahu siapa yang menulis.
    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setError(null);
      profileUnsubscribe?.();
      profileUnsubscribe = null;

      if (!nextUser) {
        setUser(null);
        setProfile(null);
        setEmailVerified(false);
        clearAuthCookies();
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setEmailVerified(nextUser.emailVerified);
      setLoading(true);

      const db = getClientDb();
      if (!db) {
        setError("Cloud Firestore belum dikonfigurasi. Isi file .env.local.");
        setLoading(false);
        return;
      }

      profileUnsubscribe = onSnapshot(
        doc(db, COLLECTIONS.users, nextUser.uid),
        (snapshot) => {
          if (!snapshot.exists()) {
            // Belum ada dokumen — kemungkinan sedang dibuat oleh
            // registerWithEmail/signInWithGoogle. Snapshot berikutnya akan
            // otomatis datang begitu dokumennya tersimpan.
            setProfile(null);
            setLoading(false);
            return;
          }

          const nextProfile = mapUserProfile(snapshot.id, snapshot.data());
          setProfile(nextProfile);
          setAuthCookies(nextProfile.role);
          setLoading(false);
        },
        (snapshotError) => {
          setProfile(null);
          setError(
            snapshotError instanceof Error
              ? snapshotError.message
              : "Gagal memuat profil pengguna."
          );
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsubscribe();
      profileUnsubscribe?.();
    };
  }, [configured]);

  const handleSignOut = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
    setProfile(null);
    setEmailVerified(false);
    setError(null);
  }, []);

  const refreshEmailVerification = useCallback(async () => {
    const auth = getClientAuth();
    const current = auth?.currentUser;
    if (!current) {
      return;
    }

    await current.reload();
    // Set dari primitive boolean (bukan objek User yang sama reference-nya
    // walau sudah di-reload) supaya React pasti render ulang komponen yang
    // membaca emailVerified — kalau cuma setUser(current) lagi, referensi
    // objeknya sering tidak berubah dan re-render bisa tidak terpicu.
    setEmailVerified(current.emailVerified);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session: toAuthSession(profile),
      emailVerified,
      loading,
      configured,
      error,
      signInWithEmail,
      signInWithGoogle,
      registerWithEmail,
      refreshEmailVerification,
      signOut: handleSignOut,
    }),
    [
      configured,
      emailVerified,
      error,
      handleSignOut,
      loading,
      profile,
      refreshEmailVerification,
      user,
    ]
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
