import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Jabatan } from "@/types";

const SORT_STEP = 10;

export const JABATAN_ESELON_OPTIONS = ["I", "II", "III", "IV", "V"] as const;
export const NO_ESELON_VALUE = "__none__";

export type JabatanEselon = (typeof JABATAN_ESELON_OPTIONS)[number];

export class JabatanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JabatanError";
  }
}

export type JabatanWriteInput = {
  name: string;
  code: string;
  eselon: string | null;
  isActive: boolean;
  sortOrder?: number;
};

export function isJabatanEselon(value: string): value is JabatanEselon {
  return (JABATAN_ESELON_OPTIONS as readonly string[]).includes(value);
}

export function sortJabatanList(items: Jabatan[]): Jabatan[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id")
    );
}

export function normalizeJabatanInput(
  input: JabatanWriteInput
): JabatanWriteInput {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const eselon = input.eselon?.trim() || null;

  if (name.length < 2) {
    throw new JabatanError("Nama minimal 2 karakter.");
  }

  if (!code) {
    throw new JabatanError("Kode wajib diisi.");
  }

  if (!/^[A-Z0-9._-]+$/.test(code)) {
    throw new JabatanError(
      "Kode hanya boleh huruf, angka, titik, strip, atau garis bawah."
    );
  }

  if (eselon && !isJabatanEselon(eselon)) {
    throw new JabatanError("Eselon tidak valid. Pilih I–V atau kosongkan.");
  }

  return {
    name,
    code,
    eselon,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

export function mapJabatanError(error: unknown): string {
  if (error instanceof JabatanError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah jabatan.";
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

export async function listJabatan(): Promise<Jabatan[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.jabatan));
  return sortJabatanList(
    snapshot.docs.map((item) => mapJabatan(item.id, item.data()))
  );
}

export async function getJabatanById(id: string): Promise<Jabatan | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.jabatan, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapJabatan(snapshot.id, snapshot.data());
}

export async function createJabatan(
  input: JabatanWriteInput,
  actorId: string
): Promise<Jabatan> {
  const db = requireDb();
  const items = await listJabatan();
  const normalized = normalizeJabatanInput(input);
  assertUniqueCode(items, normalized.code);
  assertUniqueName(items, normalized.name);

  const ref = doc(collection(db, COLLECTIONS.jabatan));
  const now = new Date().toISOString();
  const record: Jabatan = {
    id: ref.id,
    name: normalized.name,
    code: normalized.code,
    eselon: normalized.eselon,
    description: null,
    unitKerjaId: null,
    tusiIds: [],
    sortOrder: normalized.sortOrder ?? nextSortOrder(items),
    isActive: normalized.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  await setDoc(ref, record);
  return record;
}

export async function updateJabatan(
  id: string,
  input: JabatanWriteInput,
  actorId: string
): Promise<Jabatan> {
  const db = requireDb();
  const items = await listJabatan();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new JabatanError("Jabatan tidak ditemukan.");
  }

  const normalized = normalizeJabatanInput(input);
  assertUniqueCode(items, normalized.code, id);
  assertUniqueName(items, normalized.name, id);

  const now = new Date().toISOString();
  const nextSort = normalized.sortOrder ?? existing.sortOrder;

  await updateDoc(doc(db, COLLECTIONS.jabatan, id), {
    name: normalized.name,
    code: normalized.code,
    eselon: normalized.eselon,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  return {
    ...existing,
    name: normalized.name,
    code: normalized.code,
    eselon: normalized.eselon,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setJabatanActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getJabatanById(id);
  if (!existing) {
    throw new JabatanError("Jabatan tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.jabatan, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new JabatanError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueCode(items: Jabatan[], code: string, exceptId?: string) {
  const taken = items.some(
    (item) => item.code.toUpperCase() === code && item.id !== exceptId
  );

  if (taken) {
    throw new JabatanError(`Kode "${code}" sudah dipakai jabatan lain.`);
  }
}

function assertUniqueName(items: Jabatan[], name: string, exceptId?: string) {
  const taken = items.some(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() && item.id !== exceptId
  );

  if (taken) {
    throw new JabatanError(`Nama "${name}" sudah dipakai jabatan lain.`);
  }
}

function nextSortOrder(items: Jabatan[]): number {
  if (items.length === 0) {
    return SORT_STEP;
  }

  return Math.max(...items.map((item) => item.sortOrder)) + SORT_STEP;
}

function mapJabatan(id: string, data: DocumentData): Jabatan {
  const eselon =
    typeof data.eselon === "string" && isJabatanEselon(data.eselon)
      ? data.eselon
      : null;

  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    code: typeof data.code === "string" ? data.code : "",
    eselon,
    description: typeof data.description === "string" ? data.description : null,
    unitKerjaId: typeof data.unitKerjaId === "string" ? data.unitKerjaId : null,
    tusiIds: Array.isArray(data.tusiIds)
      ? data.tusiIds.filter((value): value is string => typeof value === "string")
      : [],
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function toIso(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}
