import type { UserProfile } from "@/types";
import {
  ADMIN_PATH,
  DASHBOARD_PATH,
  LOGIN_PATH,
  PENDING_PATH,
  VERIFY_EMAIL_PATH,
} from "./constants";
import { canAccessAdmin, getPostLoginPath } from "./roles";

export type GuardArea = "guest" | "dashboard" | "admin" | "pending" | "verify-email";

export type GuardResult =
  | { ok: true }
  | { ok: false; redirectTo: string; reason: string };

/**
 * `emailVerified` datang dari Firebase Auth `User.emailVerified` (BUKAN
 * field di dokumen Firestore — tidak ada field itu di sana). Selalu
 * `true` untuk akun Google (Firebase mengisinya otomatis dari provider).
 * Hanya relevan untuk akun email/password yang baru daftar dan belum
 * klik tautan verifikasi.
 */
export function requireAuthenticated(
  profile: UserProfile | null,
  emailVerified: boolean
): GuardResult {
  if (!profile) {
    return { ok: false, redirectTo: LOGIN_PATH, reason: "unauthenticated" };
  }

  if (!profile.isActive || profile.status === "nonaktif") {
    return {
      ok: false,
      redirectTo: `${LOGIN_PATH}?error=inactive`,
      reason: "inactive",
    };
  }

  if (profile.status === "pending") {
    return { ok: false, redirectTo: PENDING_PATH, reason: "pending" };
  }

  if (!emailVerified) {
    return { ok: false, redirectTo: VERIFY_EMAIL_PATH, reason: "email-not-verified" };
  }

  return { ok: true };
}

export function requireAdminArea(
  profile: UserProfile | null,
  emailVerified: boolean
): GuardResult {
  const authenticated = requireAuthenticated(profile, emailVerified);
  if (!authenticated.ok) {
    return authenticated;
  }

  if (!canAccessAdmin(profile?.role)) {
    return {
      ok: false,
      redirectTo: DASHBOARD_PATH,
      reason: "forbidden",
    };
  }

  return { ok: true };
}

export function requireDashboardArea(
  profile: UserProfile | null,
  emailVerified: boolean
): GuardResult {
  return requireAuthenticated(profile, emailVerified);
}

/** Area khusus halaman tunggu persetujuan — hanya boleh diakses akun status "pending". */
export function requirePendingArea(profile: UserProfile | null): GuardResult {
  if (!profile) {
    return { ok: false, redirectTo: LOGIN_PATH, reason: "unauthenticated" };
  }

  if (!profile.isActive || profile.status === "nonaktif") {
    return {
      ok: false,
      redirectTo: `${LOGIN_PATH}?error=inactive`,
      reason: "inactive",
    };
  }

  if (profile.status !== "pending") {
    return {
      ok: false,
      redirectTo: getPostLoginPath(profile.role),
      reason: "not-pending",
    };
  }

  return { ok: true };
}

/**
 * Area khusus halaman "verifikasi email dulu". Simetris dengan
 * requirePendingArea: begitu emailVerified jadi true (setelah pengguna
 * klik tautan lalu refreshEmailVerification() dipanggil), halaman ini
 * otomatis memantulkan balik ke dashboard/admin — tidak pernah
 * memantulkan ke arah sebaliknya kalau masih belum verified (jadi tidak
 * ada loop, cuma satu arah begitu syaratnya berubah).
 */
export function requireVerifyEmailArea(
  profile: UserProfile | null,
  emailVerified: boolean
): GuardResult {
  if (!profile) {
    return { ok: false, redirectTo: LOGIN_PATH, reason: "unauthenticated" };
  }

  if (!profile.isActive || profile.status === "nonaktif") {
    return {
      ok: false,
      redirectTo: `${LOGIN_PATH}?error=inactive`,
      reason: "inactive",
    };
  }

  if (profile.status === "pending") {
    return { ok: false, redirectTo: PENDING_PATH, reason: "pending" };
  }

  if (emailVerified) {
    return {
      ok: false,
      redirectTo: getPostLoginPath(profile.role),
      reason: "already-verified",
    };
  }

  return { ok: true };
}

export function requireGuest(profile: UserProfile | null): GuardResult {
  if (profile && profile.isActive && profile.status !== "nonaktif") {
    if (profile.status === "pending") {
      return { ok: false, redirectTo: PENDING_PATH, reason: "pending" };
    }

    return {
      ok: false,
      redirectTo: getPostLoginPath(profile.role),
      reason: "already-authenticated",
    };
  }

  return { ok: true };
}

export function resolveAreaGuard(
  area: GuardArea,
  profile: UserProfile | null,
  emailVerified: boolean
): GuardResult {
  if (area === "guest") {
    return requireGuest(profile);
  }

  if (area === "admin") {
    return requireAdminArea(profile, emailVerified);
  }

  if (area === "pending") {
    return requirePendingArea(profile);
  }

  if (area === "verify-email") {
    return requireVerifyEmailArea(profile, emailVerified);
  }

  return requireDashboardArea(profile, emailVerified);
}

export function getAdminPath() {
  return ADMIN_PATH;
}

export function getDashboardPath() {
  return DASHBOARD_PATH;
}

export function getPendingPath() {
  return PENDING_PATH;
}
