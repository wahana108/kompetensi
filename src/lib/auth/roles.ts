import type { UserProfile, UserRole } from "@/types";

export const USER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "pegawai",
];

export const ADMIN_AREA_ROLES: UserRole[] = ["super_admin", "admin"];

export function isUserRole(value: unknown): value is UserRole {
  return (
    value === "super_admin" ||
    value === "admin" ||
    value === "moderator" ||
    value === "pegawai"
  );
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function isModerator(role: UserRole | null | undefined): boolean {
  return role === "moderator";
}

export function isPegawai(role: UserRole | null | undefined): boolean {
  return role === "pegawai";
}

/** Super Admin dan Admin boleh masuk area (admin). */
export function canAccessAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin" || role === "admin";
}

/** Semua user login boleh masuk dashboard, termasuk admin. */
export function canAccessDashboard(role: UserRole | null | undefined): boolean {
  return isUserRole(role);
}

/** Atasan bukan role — user punya atasan jika supervisorId terisi. */
export function hasSupervisor(
  profile: Pick<UserProfile, "supervisorId"> | null | undefined
): boolean {
  return Boolean(profile?.supervisorId);
}

export function getPostLoginPath(role: UserRole | null | undefined): string {
  return canAccessAdmin(role) ? "/admin" : "/dashboard";
}

export function getRoleLabel(role: UserRole | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    case "pegawai":
      return "Pegawai";
    default:
      return "Tidak diketahui";
  }
}

/** Hanya Super Admin yang boleh mengubah role akun. */
export function canChangeUserRole(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

export const USER_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "pegawai", label: "Pegawai" },
];
