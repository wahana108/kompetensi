import { doc, getDoc, setDoc, type DocumentData } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { StandarKompetensi, StandarKompetensiItem } from "@/types";

export const LEVEL_STANDAR_MIN = 1;
export const LEVEL_STANDAR_MAX = 5;

export class StandarKompetensiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StandarKompetensiError";
  }
}

export function mapStandarKompetensiError(error: unknown): string {
  if (error instanceof StandarKompetensiError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah standar kompetensi.";
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

export function normalizeStandarKompetensiItems(
  items: StandarKompetensiItem[]
): StandarKompetensiItem[] {
  const seen = new Set<string>();
  const normalized: StandarKompetensiItem[] = [];

  for (const item of items) {
    if (!item.kompetensiId || seen.has(item.kompetensiId)) {
      continue;
    }

    const levelStandar = Number(item.levelStandar);
    if (
      !Number.isInteger(levelStandar) ||
      levelStandar < LEVEL_STANDAR_MIN ||
      levelStandar > LEVEL_STANDAR_MAX
    ) {
      throw new StandarKompetensiError(
        `Level standar harus bilangan bulat ${LEVEL_STANDAR_MIN}-${LEVEL_STANDAR_MAX}.`
      );
    }

    seen.add(item.kompetensiId);
    normalized.push({ kompetensiId: item.kompetensiId, levelStandar });
  }

  return normalized;
}

export async function getStandarKompetensi(
  jabatanId: string
): Promise<StandarKompetensi | null> {
  const db = requireDb();
  const snapshot = await getDoc(
    doc(db, COLLECTIONS.standarKompetensi, jabatanId)
  );
  if (!snapshot.exists()) {
    return null;
  }

  return mapStandarKompetensi(snapshot.id, snapshot.data());
}

export async function saveStandarKompetensi(
  jabatanId: string,
  items: StandarKompetensiItem[],
  actorId: string
): Promise<StandarKompetensi> {
  if (!jabatanId) {
    throw new StandarKompetensiError("Jabatan wajib dipilih.");
  }

  const db = requireDb();
  const normalized = normalizeStandarKompetensiItems(items);
  const now = new Date().toISOString();
  const record: StandarKompetensi = {
    id: jabatanId,
    jabatanId,
    items: normalized,
    updatedAt: now,
    updatedBy: actorId,
  };

  await setDoc(doc(db, COLLECTIONS.standarKompetensi, jabatanId), record);
  return record;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new StandarKompetensiError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function mapStandarKompetensi(
  id: string,
  data: DocumentData
): StandarKompetensi {
  return {
    id,
    jabatanId: typeof data.jabatanId === "string" ? data.jabatanId : id,
    items: mapItems(data.items),
    updatedAt: toIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function mapItems(value: unknown): StandarKompetensiItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as { kompetensiId?: unknown; levelStandar?: unknown };
      if (
        typeof raw.kompetensiId !== "string" ||
        typeof raw.levelStandar !== "number"
      ) {
        return null;
      }

      return { kompetensiId: raw.kompetensiId, levelStandar: raw.levelStandar };
    })
    .filter((item): item is StandarKompetensiItem => item !== null);
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
