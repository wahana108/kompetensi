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
import type { UnitKerja } from "@/types";

const ROOT_LEVEL = 1;
const SORT_STEP = 10;

export const ROOT_PARENT_VALUE = "__root__";

export class UnitKerjaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitKerjaError";
  }
}

export type UnitKerjaWriteInput = {
  name: string;
  code: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder?: number;
};

export function computeUnitLevel(parent: Pick<UnitKerja, "level"> | null): number {
  return parent ? parent.level + 1 : ROOT_LEVEL;
}

export function buildUnitPath(
  parent: Pick<UnitKerja, "path"> | null,
  id: string
): string {
  return parent ? `${parent.path}/${id}` : `/${id}`;
}

/** True jika `candidatePath` adalah path itu sendiri atau turunannya. */
export function isWithinSubtree(
  candidatePath: string,
  ancestorPath: string
): boolean {
  return (
    candidatePath === ancestorPath ||
    candidatePath.startsWith(`${ancestorPath}/`)
  );
}

export function wouldCreateCycle(
  units: UnitKerja[],
  unitId: string,
  nextParentId: string | null
): boolean {
  if (!nextParentId) {
    return false;
  }

  if (nextParentId === unitId) {
    return true;
  }

  const current = units.find((unit) => unit.id === unitId);
  const parent = units.find((unit) => unit.id === nextParentId);
  if (!current || !parent) {
    return false;
  }

  return isWithinSubtree(parent.path, current.path);
}

export function rewriteDescendantPath(
  descendantPath: string,
  oldAncestorPath: string,
  newAncestorPath: string
): string {
  return newAncestorPath + descendantPath.slice(oldAncestorPath.length);
}

export function rewriteDescendantLevel(
  descendantLevel: number,
  oldAncestorLevel: number,
  newAncestorLevel: number
): number {
  return descendantLevel + (newAncestorLevel - oldAncestorLevel);
}

export function sortUnitKerjaTree(units: UnitKerja[]): UnitKerja[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const byParent = new Map<string, UnitKerja[]>();
  const roots: UnitKerja[] = [];

  for (const unit of units) {
    const parentExists = Boolean(unit.parentId && byId.has(unit.parentId));
    if (!parentExists) {
      roots.push(unit);
      continue;
    }

    const siblings = byParent.get(unit.parentId as string) ?? [];
    siblings.push(unit);
    byParent.set(unit.parentId as string, siblings);
  }

  const result: UnitKerja[] = [];

  const visit = (node: UnitKerja) => {
    result.push(node);
    const children = (byParent.get(node.id) ?? []).slice().sort(compareUnitKerja);
    for (const child of children) {
      visit(child);
    }
  };

  roots.sort(compareUnitKerja).forEach(visit);
  return result;
}

export function getSelectableParents(
  units: UnitKerja[],
  currentId?: string
): UnitKerja[] {
  if (!currentId) {
    return units;
  }

  const current = units.find((unit) => unit.id === currentId);
  if (!current) {
    return units;
  }

  return units.filter((unit) => !isWithinSubtree(unit.path, current.path));
}

export function getUnitKerjaByIdFromList(
  units: UnitKerja[],
  id: string
): UnitKerja | undefined {
  return units.find((unit) => unit.id === id);
}

export function getParentName(
  units: UnitKerja[],
  parentId: string | null
): string | null {
  if (!parentId) {
    return null;
  }

  return units.find((unit) => unit.id === parentId)?.name ?? null;
}

export function countDirectChildren(units: UnitKerja[], id: string): number {
  return units.filter((unit) => unit.parentId === id).length;
}

export function normalizeUnitKerjaInput(
  input: UnitKerjaWriteInput
): UnitKerjaWriteInput {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();

  if (name.length < 2) {
    throw new UnitKerjaError("Nama minimal 2 karakter.");
  }

  if (!code) {
    throw new UnitKerjaError("Kode wajib diisi.");
  }

  if (!/^[A-Z0-9._-]+$/.test(code)) {
    throw new UnitKerjaError(
      "Kode hanya boleh huruf, angka, titik, strip, atau garis bawah."
    );
  }

  return {
    name,
    code,
    parentId: input.parentId || null,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };
}

export function mapUnitKerjaError(error: unknown): string {
  if (error instanceof UnitKerjaError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah unit kerja.";
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

export async function listUnitKerja(): Promise<UnitKerja[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.unitKerja));
  return sortUnitKerjaTree(
    snapshot.docs.map((item) => mapUnitKerja(item.id, item.data()))
  );
}

export async function getUnitKerjaById(id: string): Promise<UnitKerja | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.unitKerja, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapUnitKerja(snapshot.id, snapshot.data());
}

export async function createUnitKerja(
  input: UnitKerjaWriteInput,
  actorId: string
): Promise<UnitKerja> {
  const db = requireDb();
  const units = await listUnitKerja();
  const normalized = normalizeUnitKerjaInput(input);
  assertUniqueCode(units, normalized.code);

  const parent = resolveParent(units, normalized.parentId);
  const ref = doc(collection(db, COLLECTIONS.unitKerja));
  const now = new Date().toISOString();
  const record: UnitKerja = {
    id: ref.id,
    name: normalized.name,
    code: normalized.code,
    parentId: normalized.parentId,
    level: computeUnitLevel(parent),
    path: buildUnitPath(parent, ref.id),
    sortOrder: normalized.sortOrder ?? nextSortOrder(units, normalized.parentId),
    isActive: normalized.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  await setDoc(ref, record);
  return record;
}

export async function updateUnitKerja(
  id: string,
  input: UnitKerjaWriteInput,
  actorId: string
): Promise<UnitKerja> {
  const db = requireDb();
  const units = await listUnitKerja();
  const existing = units.find((unit) => unit.id === id);

  if (!existing) {
    throw new UnitKerjaError("Unit kerja tidak ditemukan.");
  }

  const normalized = normalizeUnitKerjaInput(input);
  assertUniqueCode(units, normalized.code, id);

  if (wouldCreateCycle(units, id, normalized.parentId)) {
    throw new UnitKerjaError(
      "Unit induk tidak valid. Tidak boleh memilih diri sendiri atau subunit."
    );
  }

  const parent = resolveParent(units, normalized.parentId);
  const nextLevel = computeUnitLevel(parent);
  const nextPath = buildUnitPath(parent, id);
  const parentChanged = existing.parentId !== normalized.parentId;
  const nextSort =
    normalized.sortOrder ??
    (parentChanged
      ? nextSortOrder(units, normalized.parentId)
      : existing.sortOrder);
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.update(doc(db, COLLECTIONS.unitKerja, id), {
    name: normalized.name,
    code: normalized.code,
    parentId: normalized.parentId,
    level: nextLevel,
    path: nextPath,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  if (existing.path !== nextPath || existing.level !== nextLevel) {
    const descendants = units.filter(
      (unit) => unit.id !== id && isWithinSubtree(unit.path, existing.path)
    );

    for (const child of descendants) {
      batch.update(doc(db, COLLECTIONS.unitKerja, child.id), {
        path: rewriteDescendantPath(child.path, existing.path, nextPath),
        level: rewriteDescendantLevel(child.level, existing.level, nextLevel),
        updatedAt: now,
        updatedBy: actorId,
      });
    }
  }

  await batch.commit();

  return {
    ...existing,
    name: normalized.name,
    code: normalized.code,
    parentId: normalized.parentId,
    isActive: normalized.isActive,
    level: nextLevel,
    path: nextPath,
    sortOrder: nextSort,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setUnitKerjaActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getUnitKerjaById(id);
  if (!existing) {
    throw new UnitKerjaError("Unit kerja tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.unitKerja, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new UnitKerjaError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function resolveParent(
  units: UnitKerja[],
  parentId: string | null
): UnitKerja | null {
  if (!parentId) {
    return null;
  }

  const parent = units.find((unit) => unit.id === parentId);
  if (!parent) {
    throw new UnitKerjaError("Unit induk tidak ditemukan.");
  }

  return parent;
}

function assertUniqueCode(
  units: UnitKerja[],
  code: string,
  exceptId?: string
) {
  const taken = units.some(
    (unit) => unit.code.toUpperCase() === code && unit.id !== exceptId
  );

  if (taken) {
    throw new UnitKerjaError(`Kode "${code}" sudah dipakai unit lain.`);
  }
}

function nextSortOrder(units: UnitKerja[], parentId: string | null): number {
  const siblings = units.filter((unit) => unit.parentId === parentId);
  if (siblings.length === 0) {
    return SORT_STEP;
  }

  return Math.max(...siblings.map((unit) => unit.sortOrder)) + SORT_STEP;
}

function compareUnitKerja(a: UnitKerja, b: UnitKerja) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id");
}

function mapUnitKerja(id: string, data: DocumentData): UnitKerja {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    code: typeof data.code === "string" ? data.code : "",
    parentId: typeof data.parentId === "string" ? data.parentId : null,
    level: typeof data.level === "number" && data.level > 0 ? data.level : ROOT_LEVEL,
    path: typeof data.path === "string" && data.path ? data.path : `/${id}`,
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
