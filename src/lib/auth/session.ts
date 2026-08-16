import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getClientAuth, getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { AuthSession, UserProfile, UserRole } from "@/types";
import {
  ADMIN_PATH,
  AUTH_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
  DASHBOARD_PATH,
  LOGIN_PATH,
  REGISTER_PATH,
} from "./constants";
import { mapAuthError } from "./errors";
import { canAccessAdmin, getPostLoginPath } from "./roles";
import { buildDefaultProfile, mapUserProfile } from "./user-profile";

export {
  ADMIN_PATH,
  AUTH_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
  DASHBOARD_PATH,
  LOGIN_PATH,
  REGISTER_PATH,
};

export function requireFirebaseAuth() {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error("Firebase Auth belum dikonfigurasi. Isi file .env.local.");
  }
  return auth;
}

export function requireFirebaseDb() {
  const db = getClientDb();
  if (!db) {
    throw new Error("Cloud Firestore belum dikonfigurasi. Isi file .env.local.");
  }
  return db;
}

export function toAuthSession(profile: UserProfile | null): AuthSession | null {
  if (!profile) {
    return null;
  }

  return {
    uid: profile.id,
    email: profile.email,
    role: profile.role,
    displayName: profile.displayName,
  };
}

export function getClientAuthUser(): User | null {
  return getClientAuth()?.currentUser ?? null;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const db = requireFirebaseDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snapshot.exists()) {
    return null;
  }

  return mapUserProfile(snapshot.id, snapshot.data());
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = requireFirebaseDb();
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const snapshot = await getDoc(ref);
  const now = new Date().toISOString();

  if (!snapshot.exists()) {
    const profile = buildDefaultProfile(user, now);
    await setDoc(ref, profile);
    return profile;
  }

  const existing = mapUserProfile(snapshot.id, snapshot.data());
  const nextDisplayName =
    user.displayName?.trim() || existing.displayName;
  const nextEmail = user.email ?? existing.email;
  const nextPhotoURL = user.photoURL ?? existing.photoURL;

  const changed =
    nextDisplayName !== existing.displayName ||
    nextEmail !== existing.email ||
    nextPhotoURL !== existing.photoURL;

  if (changed) {
    await updateDoc(ref, {
      displayName: nextDisplayName,
      email: nextEmail,
      photoURL: nextPhotoURL,
      updatedAt: now,
      updatedBy: user.uid,
    });

    return {
      ...existing,
      displayName: nextDisplayName,
      email: nextEmail,
      photoURL: nextPhotoURL,
      updatedAt: now,
      updatedBy: user.uid,
    };
  }

  return existing;
}

export async function getClientSession(): Promise<AuthSession | null> {
  const user = getClientAuthUser();
  if (!user) {
    return null;
  }

  const profile = await fetchUserProfile(user.uid);
  return toAuthSession(profile);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = requireFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(credential.user);
  setAuthCookies(profile.role);
  return { user: credential.user, profile };
}

export async function signInWithGoogle() {
  const auth = requireFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  const profile = await ensureUserProfile(credential.user);
  setAuthCookies(profile.role);
  return { user: credential.user, profile };
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
) {
  const auth = requireFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const name = displayName?.trim();

  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }

  const profile = await ensureUserProfile(credential.user);
  setAuthCookies(profile.role);
  return { user: credential.user, profile };
}

export async function signOutCurrentUser() {
  const auth = getClientAuth();
  if (auth) {
    await signOut(auth);
  }
  clearAuthCookies();
}

export function setAuthCookies(role: UserRole) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=1; Path=/; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_NAME}=${role}; Path=/; SameSite=Lax`;
}

export function clearAuthCookies() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=1`));
}

export function safeNextPath(
  next: string | null | undefined,
  role: UserRole | null | undefined
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return getPostLoginPath(role);
  }

  if (next.startsWith(ADMIN_PATH) && !canAccessAdmin(role)) {
    return DASHBOARD_PATH;
  }

  if (next === LOGIN_PATH || next === REGISTER_PATH) {
    return getPostLoginPath(role);
  }

  return next;
}

export function getFirebaseReadyState() {
  return {
    configured: isFirebaseConfigured(),
  };
}

export { mapAuthError, mapUserProfile };
