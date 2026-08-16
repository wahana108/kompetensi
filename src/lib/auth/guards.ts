import type { UserProfile } from "@/types";
import {
  ADMIN_PATH,
  DASHBOARD_PATH,
  LOGIN_PATH,
} from "./constants";
import { canAccessAdmin, getPostLoginPath } from "./roles";

export type GuardArea = "guest" | "dashboard" | "admin";

export type GuardResult =
  | { ok: true }
  | { ok: false; redirectTo: string; reason: string };

export function requireAuthenticated(
  profile: UserProfile | null
): GuardResult {
  if (!profile) {
    return { ok: false, redirectTo: LOGIN_PATH, reason: "unauthenticated" };
  }

  if (!profile.isActive) {
    return {
      ok: false,
      redirectTo: `${LOGIN_PATH}?error=inactive`,
      reason: "inactive",
    };
  }

  return { ok: true };
}

export function requireAdminArea(profile: UserProfile | null): GuardResult {
  const authenticated = requireAuthenticated(profile);
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

export function requireDashboardArea(profile: UserProfile | null): GuardResult {
  return requireAuthenticated(profile);
}

export function requireGuest(profile: UserProfile | null): GuardResult {
  if (profile && profile.isActive) {
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
  profile: UserProfile | null
): GuardResult {
  if (area === "guest") {
    return requireGuest(profile);
  }

  if (area === "admin") {
    return requireAdminArea(profile);
  }

  return requireDashboardArea(profile);
}

export function getAdminPath() {
  return ADMIN_PATH;
}

export function getDashboardPath() {
  return DASHBOARD_PATH;
}
