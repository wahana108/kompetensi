import type { Activatable, Auditable, IsoDateString } from "./common";

/**
 * Role akun. Atasan bukan role — relasi atasan-bawahan memakai `supervisorId`.
 */
export type UserRole = "super_admin" | "admin" | "moderator" | "pegawai";

export interface UserProfile extends Activatable, Auditable {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  nip: string | null;
  role: UserRole;
  supervisorId: string | null;
  unitKerjaId: string | null;
  jabatanId: string | null;
  pangkatId: string | null;
  tusiIds: string[];
}

export interface AuthSession {
  uid: string;
  email: string | null;
  role: UserRole | null;
  displayName: string | null;
}

export interface UserAssignmentSnapshot {
  unitKerjaId: string | null;
  jabatanId: string | null;
  pangkatId: string | null;
  tusiIds: string[];
  capturedAt: IsoDateString | null;
}
