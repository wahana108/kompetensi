import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { KompetensiLevel } from "@/types";

export class KompetensiLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KompetensiLevelError";
  }
}

export type KompetensiLevelWriteInput = {
  name: string;
  code: string;
  level: number;
  description: string | null;
  isActive: boolean;
};

export const DEFAULT_KOMPETENSI_LEVELS: Array<
  Omit<KompetensiLevelWriteInput, "isActive">
> = [
  {
    name: "Sangat Tidak Mampu",
    code: "STM",
    level: 1,
    description: "Belum menunjukkan kompetensi yang diharapkan.",
  },
  {
    name: "Tidak Mampu",
    code: "TM",
    level: 2,
    description: "Kompetensi masih jauh dari standar.",
  },
  {
    name: "Cukup",
    code: "C",
    level: 3,
    description: "Kompetensi memenuhi standar minimal.",
  },
  {
    name: "Mampu",
    code: "M",
    level: 4,
    description: "Kompetensi memenuhi standar dengan baik.",
  },
  {
    name: "Sangat Mampu",
    code: "SM",
    level: 5,
    description: "Kompetensi melebihi standar yang diharapkan.",
  },
];

export function sortKompetensiLevelList(
  items: KompetensiLevel[]
): KompetensiLevel[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.level - b.level ||
        a.name.localeCompare(b.name, "id")
    );
}

export function normalizeKompetensiLevelInput(
  input: KompetensiLevelWriteInput
): KompetensiLevelWriteInput {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const description = input.description?.trim() || null;
  const level = Number(input.level);

  if (name.length < 2) {
    throw new KompetensiLevelError("Nama minimal 2 karakter.");
  }

  if (code && !/^[A-Z0-9._-]+$/.test(code)) {
    throw new KompetensiLevelError(
      "Kode hanya boleh huruf, angka, titik, strip, atau garis bawah."
    );
  }

  if (!Number.isInteger(level) || level < 1) {
    throw new KompetensiLevelError("Nilai / urutan harus bilangan bulat minimal 1.");
  }

  return {
    name,
    code,
    level,
    description,
    isActive: input.isActive,
  };
}

export function mapKompetensiLevelError(error: unknown): string {
  if (error instanceof KompetensiLevelError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah level kompetensi.";
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

export async function listKompetensiLevels(): Promise<KompetensiLevel[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.kompetensiLevels));
  return sortKompetensiLevelList(
    snapshot.docs
      .map((item) => mapKompetensiLevel(item.id, item.data()))
      .filter((item) => item.kompetensiId === null)
  );
}

export async function getKompetensiLevelById(
  id: string
): Promise<KompetensiLevel | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.kompetensiLevels, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapKompetensiLevel(snapshot.id, snapshot.data());
}

export async function createKompetensiLevel(
  input: KompetensiLevelWriteInput,
  actorId: string
): Promise<KompetensiLevel> {
  const db = requireDb();
  const items = await listKompetensiLevels();
  const normalized = normalizeKompetensiLevelInput(input);
  assertUniqueName(items, normalized.name);
  assertUniqueCode(items, normalized.code);
  assertUniqueLevel(items, normalized.level);

  const ref = doc(collection(db, COLLECTIONS.kompetensiLevels));
  const now = new Date().toISOString();
  const record: KompetensiLevel = {
    id: ref.id,
    kompetensiId: null,
    level: normalized.level,
    code: normalized.code,
    name: normalized.name,
    description: normalized.description,
    minScore: null,
    maxScore: null,
    sortOrder: normalized.level,
    isActive: normalized.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  await setDoc(ref, record);
  return record;
}

export async function updateKompetensiLevel(
  id: string,
  input: KompetensiLevelWriteInput,
  actorId: string
): Promise<KompetensiLevel> {
  const db = requireDb();
  const items = await listKompetensiLevels();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new KompetensiLevelError("Level kompetensi tidak ditemukan.");
  }

  const normalized = normalizeKompetensiLevelInput(input);
  assertUniqueName(items, normalized.name, id);
  assertUniqueCode(items, normalized.code, id);
  assertUniqueLevel(items, normalized.level, id);

  const now = new Date().toISOString();

  await updateDoc(doc(db, COLLECTIONS.kompetensiLevels, id), {
    name: normalized.name,
    code: normalized.code,
    level: normalized.level,
    description: normalized.description,
    sortOrder: normalized.level,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  return {
    ...existing,
    ...normalized,
    sortOrder: normalized.level,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setKompetensiLevelActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getKompetensiLevelById(id);
  if (!existing) {
    throw new KompetensiLevelError("Level kompetensi tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.kompetensiLevels, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

export async function moveKompetensiLevel(
  id: string,
  direction: "up" | "down",
  actorId: string
): Promise<void> {
  const items = await listKompetensiLevels();
  const index = items.findIndex((item) => item.id === id);

  if (index < 0) {
    throw new KompetensiLevelError("Level kompetensi tidak ditemukan.");
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  const current = items[index];
  const neighbor = items[swapIndex];

  if (!current || !neighbor) {
    return;
  }

  const db = requireDb();
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.update(doc(db, COLLECTIONS.kompetensiLevels, current.id), {
    level: neighbor.level,
    sortOrder: neighbor.level,
    updatedAt: now,
    updatedBy: actorId,
  });
  batch.update(doc(db, COLLECTIONS.kompetensiLevels, neighbor.id), {
    level: current.level,
    sortOrder: current.level,
    updatedAt: now,
    updatedBy: actorId,
  });

  await batch.commit();
}

export async function seedDefaultKompetensiLevels(
  actorId: string
): Promise<KompetensiLevel[]> {
  const existing = await listKompetensiLevels();
  if (existing.length > 0) {
    throw new KompetensiLevelError(
      "Level sudah ada. Seed hanya untuk koleksi kosong."
    );
  }

  const db = requireDb();
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const records: KompetensiLevel[] = [];

  for (const item of DEFAULT_KOMPETENSI_LEVELS) {
    const ref = doc(collection(db, COLLECTIONS.kompetensiLevels));
    const record: KompetensiLevel = {
      id: ref.id,
      kompetensiId: null,
      level: item.level,
      code: item.code,
      name: item.name,
      description: item.description,
      minScore: null,
      maxScore: null,
      sortOrder: item.level,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    };
    batch.set(ref, record);
    records.push(record);
  }

  await batch.commit();
  return records;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new KompetensiLevelError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueName(
  items: KompetensiLevel[],
  name: string,
  exceptId?: string
) {
  const taken = items.some(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() && item.id !== exceptId
  );

  if (taken) {
    throw new KompetensiLevelError(`Nama "${name}" sudah dipakai level lain.`);
  }
}

function assertUniqueCode(
  items: KompetensiLevel[],
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
    throw new KompetensiLevelError(`Kode "${code}" sudah dipakai level lain.`);
  }
}

function assertUniqueLevel(
  items: KompetensiLevel[],
  level: number,
  exceptId?: string
) {
  const taken = items.some(
    (item) => item.level === level && item.id !== exceptId
  );

  if (taken) {
    throw new KompetensiLevelError(`Nilai ${level} sudah dipakai level lain.`);
  }
}

function mapKompetensiLevel(id: string, data: DocumentData): KompetensiLevel {
  return {
    id,
    kompetensiId: typeof data.kompetensiId === "string" ? data.kompetensiId : null,
    level: typeof data.level === "number" ? data.level : 0,
    code: typeof data.code === "string" ? data.code : "",
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : null,
    minScore: typeof data.minScore === "number" ? data.minScore : null,
    maxScore: typeof data.maxScore === "number" ? data.maxScore : null,
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
