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
import { getJabatanById } from "@/lib/services/jabatan";
import { getUnitKerjaById } from "@/lib/services/unit-kerja";
import type { Tusi } from "@/types";

const SORT_STEP = 10;

export const NO_JABATAN_VALUE = "__none__";
export const ALL_UNITS_VALUE = "__all__";

export class TusiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TusiError";
  }
}

export type TusiWriteInput = {
  name: string;
  code: string;
  description: string | null;
  unitKerjaId: string;
  jabatanId: string | null;
  isActive: boolean;
  sortOrder?: number;
};

export function sortTusiList(items: Tusi[]): Tusi[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id")
    );
}

export function normalizeTusiInput(input: TusiWriteInput): TusiWriteInput {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const description = input.description?.trim() || null;
  const unitKerjaId = input.unitKerjaId.trim();
  const jabatanId = input.jabatanId?.trim() || null;

  if (name.length < 2) {
    throw new TusiError("Nama / judul TUSI minimal 2 karakter.");
  }

  if (code && !/^[A-Z0-9._-]+$/.test(code)) {
    throw new TusiError(
      "Kode hanya boleh huruf, angka, titik, strip, atau garis bawah."
    );
  }

  if (!unitKerjaId) {
    throw new TusiError("Unit kerja wajib dipilih.");
  }

  return {
    name,
    code,
    description,
    unitKerjaId,
    jabatanId,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

export function mapTusiError(error: unknown): string {
  if (error instanceof TusiError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah TUSI.";
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

export async function listTusi(): Promise<Tusi[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.tusi));
  return sortTusiList(snapshot.docs.map((item) => mapTusi(item.id, item.data())));
}

export async function getTusiById(id: string): Promise<Tusi | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.tusi, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapTusi(snapshot.id, snapshot.data());
}

export async function createTusi(
  input: TusiWriteInput,
  actorId: string
): Promise<Tusi> {
  const db = requireDb();
  const items = await listTusi();
  const normalized = await validateRelations(normalizeTusiInput(input));
  assertUniqueNameInUnit(items, normalized.name, normalized.unitKerjaId);
  assertUniqueCode(items, normalized.code);

  const ref = doc(collection(db, COLLECTIONS.tusi));
  const now = new Date().toISOString();
  const record: Tusi = {
    id: ref.id,
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    unitKerjaId: normalized.unitKerjaId,
    jabatanId: normalized.jabatanId,
    kompetensiIds: [],
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

export async function updateTusi(
  id: string,
  input: TusiWriteInput,
  actorId: string
): Promise<Tusi> {
  const db = requireDb();
  const items = await listTusi();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new TusiError("TUSI tidak ditemukan.");
  }

  const normalized = await validateRelations(normalizeTusiInput(input));
  assertUniqueNameInUnit(items, normalized.name, normalized.unitKerjaId, id);
  assertUniqueCode(items, normalized.code, id);

  const now = new Date().toISOString();
  const nextSort = normalized.sortOrder ?? existing.sortOrder;

  await updateDoc(doc(db, COLLECTIONS.tusi, id), {
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    unitKerjaId: normalized.unitKerjaId,
    jabatanId: normalized.jabatanId,
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
    unitKerjaId: normalized.unitKerjaId,
    jabatanId: normalized.jabatanId,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setTusiActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getTusiById(id);
  if (!existing) {
    throw new TusiError("TUSI tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.tusi, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

async function validateRelations(
  input: TusiWriteInput
): Promise<TusiWriteInput> {
  const unit = await getUnitKerjaById(input.unitKerjaId);
  if (!unit) {
    throw new TusiError("Unit kerja tidak ditemukan.");
  }

  if (input.jabatanId) {
    const jabatan = await getJabatanById(input.jabatanId);
    if (!jabatan) {
      throw new TusiError("Jabatan tidak ditemukan.");
    }
  }

  return input;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new TusiError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueNameInUnit(
  items: Tusi[],
  name: string,
  unitKerjaId: string,
  exceptId?: string
) {
  const taken = items.some(
    (item) =>
      item.unitKerjaId === unitKerjaId &&
      item.name.toLowerCase() === name.toLowerCase() &&
      item.id !== exceptId
  );

  if (taken) {
    throw new TusiError(
      `Nama "${name}" sudah dipakai TUSI lain di unit kerja ini.`
    );
  }
}

function assertUniqueCode(items: Tusi[], code: string, exceptId?: string) {
  if (!code) {
    return;
  }

  const taken = items.some(
    (item) => item.code.toUpperCase() === code && item.id !== exceptId
  );

  if (taken) {
    throw new TusiError(`Kode "${code}" sudah dipakai TUSI lain.`);
  }
}

function nextSortOrder(items: Tusi[]): number {
  if (items.length === 0) {
    return SORT_STEP;
  }

  return Math.max(...items.map((item) => item.sortOrder)) + SORT_STEP;
}

function mapTusi(id: string, data: DocumentData): Tusi {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    code: typeof data.code === "string" ? data.code : "",
    description: typeof data.description === "string" ? data.description : null,
    unitKerjaId: typeof data.unitKerjaId === "string" ? data.unitKerjaId : "",
    jabatanId: typeof data.jabatanId === "string" ? data.jabatanId : null,
    kompetensiIds: Array.isArray(data.kompetensiIds)
      ? data.kompetensiIds.filter(
          (value): value is string => typeof value === "string"
        )
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
