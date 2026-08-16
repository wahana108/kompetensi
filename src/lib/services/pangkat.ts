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
import type { Pangkat } from "@/types";

const SORT_STEP = 10;

export class PangkatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PangkatError";
  }
}

export type PangkatWriteInput = {
  name: string;
  golongan: string;
  isActive: boolean;
  sortOrder: number;
};

export function sortPangkatList(items: Pangkat[]): Pangkat[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id")
    );
}

export function normalizePangkatInput(
  input: PangkatWriteInput
): PangkatWriteInput {
  const name = input.name.trim();
  const golongan = normalizeGolongan(input.golongan);
  const sortOrder = Number(input.sortOrder);

  if (name.length < 2) {
    throw new PangkatError("Nama minimal 2 karakter.");
  }

  if (!golongan) {
    throw new PangkatError("Golongan wajib diisi.");
  }

  if (!/^[IVX]+\/[a-eA-E]$/.test(golongan) && !/^[IVX]+$/.test(golongan)) {
    throw new PangkatError(
      "Format golongan tidak valid. Contoh: III/a atau IV/c."
    );
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 1) {
    throw new PangkatError("Urutan harus bilangan bulat minimal 1.");
  }

  return {
    name,
    golongan,
    isActive: input.isActive,
    sortOrder,
  };
}

export function mapPangkatError(error: unknown): string {
  if (error instanceof PangkatError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah pangkat.";
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

export async function listPangkat(): Promise<Pangkat[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.pangkat));
  return sortPangkatList(
    snapshot.docs.map((item) => mapPangkat(item.id, item.data()))
  );
}

export async function getPangkatById(id: string): Promise<Pangkat | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.pangkat, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapPangkat(snapshot.id, snapshot.data());
}

export async function createPangkat(
  input: PangkatWriteInput,
  actorId: string
): Promise<Pangkat> {
  const db = requireDb();
  const items = await listPangkat();
  const normalized = normalizePangkatInput({
    ...input,
    sortOrder: input.sortOrder || nextSortOrder(items),
  });
  assertUniqueGolongan(items, normalized.golongan);
  assertUniqueName(items, normalized.name);

  const ref = doc(collection(db, COLLECTIONS.pangkat));
  const now = new Date().toISOString();
  const record: Pangkat = {
    id: ref.id,
    name: normalized.name,
    golongan: normalized.golongan,
    sortOrder: normalized.sortOrder,
    isActive: normalized.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  await setDoc(ref, record);
  return record;
}

export async function updatePangkat(
  id: string,
  input: PangkatWriteInput,
  actorId: string
): Promise<Pangkat> {
  const db = requireDb();
  const items = await listPangkat();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new PangkatError("Pangkat tidak ditemukan.");
  }

  const normalized = normalizePangkatInput(input);
  assertUniqueGolongan(items, normalized.golongan, id);
  assertUniqueName(items, normalized.name, id);

  const now = new Date().toISOString();

  await updateDoc(doc(db, COLLECTIONS.pangkat, id), {
    name: normalized.name,
    golongan: normalized.golongan,
    sortOrder: normalized.sortOrder,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  return {
    ...existing,
    ...normalized,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setPangkatActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getPangkatById(id);
  if (!existing) {
    throw new PangkatError("Pangkat tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.pangkat, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

export function nextPangkatSortOrder(items: Pangkat[]): number {
  return nextSortOrder(items);
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new PangkatError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueGolongan(
  items: Pangkat[],
  golongan: string,
  exceptId?: string
) {
  const taken = items.some(
    (item) =>
      item.golongan.toLowerCase() === golongan.toLowerCase() &&
      item.id !== exceptId
  );

  if (taken) {
    throw new PangkatError(`Golongan "${golongan}" sudah dipakai pangkat lain.`);
  }
}

function assertUniqueName(items: Pangkat[], name: string, exceptId?: string) {
  const taken = items.some(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() && item.id !== exceptId
  );

  if (taken) {
    throw new PangkatError(`Nama "${name}" sudah dipakai pangkat lain.`);
  }
}

function normalizeGolongan(value: string): string {
  const cleaned = value.trim().replace(/\s*\/\s*/g, "/");
  const [roman, letter] = cleaned.split("/");
  if (!letter) {
    return roman.toUpperCase();
  }

  return `${roman.toUpperCase()}/${letter.toLowerCase()}`;
}

function nextSortOrder(items: Pangkat[]): number {
  if (items.length === 0) {
    return SORT_STEP;
  }

  return Math.max(...items.map((item) => item.sortOrder)) + SORT_STEP;
}

function mapPangkat(id: string, data: DocumentData): Pangkat {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    golongan: typeof data.golongan === "string" ? data.golongan : "",
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
