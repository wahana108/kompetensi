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
import { getKompetensiLevelById } from "@/lib/services/kompetensi-level";
import type { Kompetensi, KompetensiCategory, KompetensiDimensi } from "@/types";

const SORT_STEP = 10;

export const KOMPETENSI_DIMENSI_OPTIONS: Array<{
  value: KompetensiDimensi;
  label: string;
}> = [
  { value: "pengetahuan", label: "Pengetahuan" },
  { value: "keterampilan", label: "Keterampilan" },
  { value: "sikap_perilaku", label: "Sikap Perilaku" },
];

export class KompetensiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KompetensiError";
  }
}

export type KompetensiWriteInput = {
  name: string;
  code: string;
  description: string | null;
  dimensi: KompetensiDimensi;
  levelIds: string[];
  isActive: boolean;
  sortOrder?: number;
};

export function isKompetensiDimensi(
  value: string
): value is KompetensiDimensi {
  return KOMPETENSI_DIMENSI_OPTIONS.some((item) => item.value === value);
}

export function getKompetensiDimensiLabel(value: KompetensiDimensi): string {
  return (
    KOMPETENSI_DIMENSI_OPTIONS.find((item) => item.value === value)?.label ??
    value
  );
}

export function sortKompetensiList(items: Kompetensi[]): Kompetensi[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id")
    );
}

export function normalizeKompetensiInput(
  input: KompetensiWriteInput
): KompetensiWriteInput {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const description = input.description?.trim() || null;
  const uniqueLevelIds = Array.from(new Set(input.levelIds.filter(Boolean)));

  if (name.length < 2) {
    throw new KompetensiError("Nama kompetensi minimal 2 karakter.");
  }

  if (code && !/^[A-Z0-9._-]+$/.test(code)) {
    throw new KompetensiError(
      "Kode hanya boleh huruf, angka, titik, strip, atau garis bawah."
    );
  }

  if (!isKompetensiDimensi(input.dimensi)) {
    throw new KompetensiError("Dimensi tidak valid.");
  }

  return {
    name,
    code,
    description,
    dimensi: input.dimensi,
    levelIds: uniqueLevelIds,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

export function mapKompetensiError(error: unknown): string {
  if (error instanceof KompetensiError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah kompetensi.";
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

export async function listKompetensi(): Promise<Kompetensi[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.kompetensi));
  return sortKompetensiList(
    snapshot.docs.map((item) => mapKompetensi(item.id, item.data()))
  );
}

export async function getKompetensiById(id: string): Promise<Kompetensi | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.kompetensi, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapKompetensi(snapshot.id, snapshot.data());
}

export async function createKompetensi(
  input: KompetensiWriteInput,
  actorId: string
): Promise<Kompetensi> {
  const db = requireDb();
  const items = await listKompetensi();
  const normalized = await validateLevelIds(normalizeKompetensiInput(input));
  assertUniqueName(items, normalized.name);
  assertUniqueCode(items, normalized.code);

  const ref = doc(collection(db, COLLECTIONS.kompetensi));
  const now = new Date().toISOString();
  const record: Kompetensi = {
    id: ref.id,
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    dimensi: normalized.dimensi,
    category: "lainnya",
    levelIds: normalized.levelIds,
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

export async function updateKompetensi(
  id: string,
  input: KompetensiWriteInput,
  actorId: string
): Promise<Kompetensi> {
  const db = requireDb();
  const items = await listKompetensi();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new KompetensiError("Kompetensi tidak ditemukan.");
  }

  const normalized = await validateLevelIds(normalizeKompetensiInput(input));
  assertUniqueName(items, normalized.name, id);
  assertUniqueCode(items, normalized.code, id);

  const now = new Date().toISOString();
  const nextSort = normalized.sortOrder ?? existing.sortOrder;

  await updateDoc(doc(db, COLLECTIONS.kompetensi, id), {
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    dimensi: normalized.dimensi,
    levelIds: normalized.levelIds,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  return {
    ...existing,
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    dimensi: normalized.dimensi,
    levelIds: normalized.levelIds,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setKompetensiActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getKompetensiById(id);
  if (!existing) {
    throw new KompetensiError("Kompetensi tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.kompetensi, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

async function validateLevelIds(
  input: KompetensiWriteInput
): Promise<KompetensiWriteInput> {
  for (const levelId of input.levelIds) {
    const level = await getKompetensiLevelById(levelId);
    if (!level || level.kompetensiId !== null) {
      throw new KompetensiError("Salah satu level yang dipilih tidak valid.");
    }
  }

  return input;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new KompetensiError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueName(
  items: Kompetensi[],
  name: string,
  exceptId?: string
) {
  const taken = items.some(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() && item.id !== exceptId
  );

  if (taken) {
    throw new KompetensiError(`Nama "${name}" sudah dipakai kompetensi lain.`);
  }
}

function assertUniqueCode(
  items: Kompetensi[],
  code: string,
  exceptId?: string
) {
  if (!code) {
    return;
  }

  const taken = items.some(
    (item) => item.code.toUpperCase() === code && item.id !== exceptId
  );

  if (taken) {
    throw new KompetensiError(`Kode "${code}" sudah dipakai kompetensi lain.`);
  }
}

function nextSortOrder(items: Kompetensi[]): number {
  if (items.length === 0) {
    return SORT_STEP;
  }

  return Math.max(...items.map((item) => item.sortOrder)) + SORT_STEP;
}

function mapKompetensi(id: string, data: DocumentData): Kompetensi {
  const rawDimensi = String(data.dimensi ?? "");
  const dimensi = isKompetensiDimensi(rawDimensi) ? rawDimensi : "pengetahuan";
  const category = isKompetensiCategory(data.category)
    ? data.category
    : "lainnya";

  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    code: typeof data.code === "string" ? data.code : "",
    description: typeof data.description === "string" ? data.description : null,
    dimensi,
    category,
    levelIds: Array.isArray(data.levelIds)
      ? data.levelIds.filter((value): value is string => typeof value === "string")
      : [],
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function isKompetensiCategory(value: unknown): value is KompetensiCategory {
  return (
    value === "teknis" ||
    value === "manajerial" ||
    value === "sosial_kultural" ||
    value === "lainnya"
  );
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
