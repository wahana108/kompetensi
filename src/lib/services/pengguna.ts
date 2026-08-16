import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { mapUserProfile } from "@/lib/auth/user-profile";
import { canChangeUserRole, isUserRole } from "@/lib/auth/roles";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getJabatanById } from "@/lib/services/jabatan";
import { getPangkatById } from "@/lib/services/pangkat";
import { getTusiById } from "@/lib/services/tusi";
import { getUnitKerjaById } from "@/lib/services/unit-kerja";
import type { UserProfile, UserRole } from "@/types";

export const NO_ASSIGNMENT_VALUE = "__none__";

export class PenggunaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PenggunaError";
  }
}

export type PenggunaWriteInput = {
  role: UserRole;
  unitKerjaId: string | null;
  jabatanId: string | null;
  pangkatId: string | null;
  supervisorId: string | null;
  tusiIds: string[];
};

export function sortPenggunaList(items: UserProfile[]): UserProfile[] {
  return items
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "id"));
}

export function wouldCreateSupervisorCycle(
  users: UserProfile[],
  userId: string,
  supervisorId: string | null
): boolean {
  if (!supervisorId) {
    return false;
  }

  if (supervisorId === userId) {
    return true;
  }

  const byId = new Map(users.map((item) => [item.id, item]));
  const seen = new Set<string>();
  let current = byId.get(supervisorId) ?? null;

  while (current) {
    if (current.id === userId) {
      return true;
    }

    if (seen.has(current.id)) {
      return true;
    }

    seen.add(current.id);
    current = current.supervisorId ? (byId.get(current.supervisorId) ?? null) : null;
  }

  return false;
}

export function countSubordinates(users: UserProfile[], userId: string): number {
  return users.filter((item) => item.supervisorId === userId).length;
}

export function mapPenggunaError(error: unknown): string {
  if (error instanceof PenggunaError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah data pengguna ini.";
    }
    if (code === "unavailable") {
      return "Layanan Firestore tidak tersedia. Pastikan emulator berjalan.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan. Coba lagi.";
}

export async function listPengguna(): Promise<UserProfile[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.users));
  return sortPenggunaList(
    snapshot.docs.map((item) => mapUserProfile(item.id, item.data()))
  );
}

export async function listSubordinates(
  supervisorId: string
): Promise<UserProfile[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.users),
      where("supervisorId", "==", supervisorId)
    )
  );

  return sortPenggunaList(
    snapshot.docs.map((item) => mapUserProfile(item.id, item.data()))
  );
}

export async function getPenggunaById(id: string): Promise<UserProfile | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapUserProfile(snapshot.id, snapshot.data());
}

export async function updatePengguna(
  id: string,
  input: PenggunaWriteInput,
  actor: Pick<UserProfile, "id" | "role">
): Promise<UserProfile> {
  const db = requireDb();
  const users = await listPengguna();
  const existing = users.find((item) => item.id === id);

  if (!existing) {
    throw new PenggunaError("Pengguna tidak ditemukan.");
  }

  const nextRole = resolveNextRole(existing, input.role, actor, users);
  const unitKerjaId = input.unitKerjaId || null;
  const jabatanId = input.jabatanId || null;
  const pangkatId = input.pangkatId || null;
  const supervisorId = input.supervisorId || null;
  const tusiIds = Array.from(new Set(input.tusiIds.filter(Boolean)));

  if (supervisorId === id) {
    throw new PenggunaError("Pengguna tidak boleh menjadi atasan dirinya sendiri.");
  }

  if (wouldCreateSupervisorCycle(users, id, supervisorId)) {
    throw new PenggunaError(
      "Atasan tidak valid. Tidak boleh memilih bawahan atau membentuk siklus."
    );
  }

  await validateAssignments({
    unitKerjaId,
    jabatanId,
    pangkatId,
    supervisorId,
    tusiIds,
    users,
  });

  const now = new Date().toISOString();
  await updateDoc(doc(db, COLLECTIONS.users, id), {
    role: nextRole,
    unitKerjaId,
    jabatanId,
    pangkatId,
    supervisorId,
    tusiIds,
    updatedAt: now,
    updatedBy: actor.id,
  });

  return {
    ...existing,
    role: nextRole,
    unitKerjaId,
    jabatanId,
    pangkatId,
    supervisorId,
    tusiIds,
    updatedAt: now,
    updatedBy: actor.id,
  };
}

function resolveNextRole(
  existing: UserProfile,
  requested: UserRole,
  actor: Pick<UserProfile, "id" | "role">,
  users: UserProfile[]
): UserRole {
  if (!isUserRole(requested)) {
    throw new PenggunaError("Role tidak valid.");
  }

  if (requested === existing.role) {
    return existing.role;
  }

  if (!canChangeUserRole(actor.role)) {
    throw new PenggunaError("Hanya Super Admin yang boleh mengubah role.");
  }

  if (
    existing.role === "super_admin" &&
    requested !== "super_admin" &&
    users.filter((item) => item.role === "super_admin").length <= 1
  ) {
    throw new PenggunaError("Tidak boleh menurunkan Super Admin terakhir.");
  }

  return requested;
}

async function validateAssignments(input: {
  unitKerjaId: string | null;
  jabatanId: string | null;
  pangkatId: string | null;
  supervisorId: string | null;
  tusiIds: string[];
  users: UserProfile[];
}) {
  if (input.unitKerjaId && !(await getUnitKerjaById(input.unitKerjaId))) {
    throw new PenggunaError("Unit kerja tidak ditemukan.");
  }

  if (input.jabatanId && !(await getJabatanById(input.jabatanId))) {
    throw new PenggunaError("Jabatan tidak ditemukan.");
  }

  if (input.pangkatId && !(await getPangkatById(input.pangkatId))) {
    throw new PenggunaError("Pangkat tidak ditemukan.");
  }

  if (input.supervisorId && !input.users.some((item) => item.id === input.supervisorId)) {
    throw new PenggunaError("Atasan tidak ditemukan.");
  }

  for (const tusiId of input.tusiIds) {
    if (!(await getTusiById(tusiId))) {
      throw new PenggunaError("Salah satu TUSI yang dipilih tidak ditemukan.");
    }
  }
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new PenggunaError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}
