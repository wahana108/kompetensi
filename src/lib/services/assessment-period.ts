import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { AssessmentPeriod, AssessmentPeriodStatus } from "@/types";

export class AssessmentPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentPeriodError";
  }
}

export type AssessmentPeriodWriteInput = {
  name: string;
  year: number;
  startsAt: string;
  endsAt: string;
  status: AssessmentPeriodStatus;
};

export const PERIOD_STATUS_OPTIONS: Array<{
  value: AssessmentPeriodStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Aktif" },
  { value: "closed", label: "Selesai" },
];

export function isAssessmentPeriodStatus(
  value: string
): value is AssessmentPeriodStatus {
  return value === "draft" || value === "active" || value === "closed";
}

export function getPeriodStatusLabel(status: AssessmentPeriodStatus): string {
  return (
    PERIOD_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function isPeriodWithinDates(
  period: Pick<AssessmentPeriod, "startsAt" | "endsAt">,
  day = todayDateString()
): boolean {
  const start = toDateInputValue(period.startsAt);
  const end = toDateInputValue(period.endsAt);
  return day >= start && day <= end;
}

export function isPeriodFillable(period: AssessmentPeriod): boolean {
  return period.status === "active" && isPeriodWithinDates(period);
}

export function sortPeriodList(items: AssessmentPeriod[]): AssessmentPeriod[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        b.year - a.year ||
        toDateInputValue(b.startsAt).localeCompare(toDateInputValue(a.startsAt)) ||
        a.name.localeCompare(b.name, "id")
    );
}

export function normalizePeriodInput(
  input: AssessmentPeriodWriteInput
): AssessmentPeriodWriteInput {
  const name = input.name.trim();
  const year = Number(input.year);
  const startsAt = toDateInputValue(input.startsAt);
  const endsAt = toDateInputValue(input.endsAt);

  if (name.length < 2) {
    throw new AssessmentPeriodError("Nama periode minimal 2 karakter.");
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AssessmentPeriodError("Tahun tidak valid.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsAt)) {
    throw new AssessmentPeriodError("Tanggal mulai wajib diisi.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsAt)) {
    throw new AssessmentPeriodError("Tanggal selesai wajib diisi.");
  }

  if (endsAt < startsAt) {
    throw new AssessmentPeriodError(
      "Tanggal selesai tidak boleh sebelum tanggal mulai."
    );
  }

  if (!isAssessmentPeriodStatus(input.status)) {
    throw new AssessmentPeriodError("Status periode tidak valid.");
  }

  return {
    name,
    year,
    startsAt,
    endsAt,
    status: input.status,
  };
}

export function mapPeriodError(error: unknown): string {
  if (error instanceof AssessmentPeriodError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah periode penilaian.";
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

export async function listAssessmentPeriods(): Promise<AssessmentPeriod[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.assessmentPeriods));
  return sortPeriodList(
    snapshot.docs.map((item) => mapPeriod(item.id, item.data()))
  );
}

export async function getActiveAssessmentPeriod(): Promise<AssessmentPeriod | null> {
  const items = await listAssessmentPeriods();
  return items.find((item) => item.status === "active") ?? null;
}

export async function getAssessmentPeriodById(
  id: string
): Promise<AssessmentPeriod | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.assessmentPeriods, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapPeriod(snapshot.id, snapshot.data());
}

export async function createAssessmentPeriod(
  input: AssessmentPeriodWriteInput,
  actorId: string
): Promise<AssessmentPeriod> {
  const db = requireDb();
  const items = await listAssessmentPeriods();
  const normalized = normalizePeriodInput(input);
  assertUniqueNameYear(items, normalized.name, normalized.year);

  const ref = doc(collection(db, COLLECTIONS.assessmentPeriods));
  const now = new Date().toISOString();
  const record: AssessmentPeriod = {
    id: ref.id,
    name: normalized.name,
    year: normalized.year,
    startsAt: normalized.startsAt,
    endsAt: normalized.endsAt,
    status: normalized.status,
    questionnaireId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  if (normalized.status === "active") {
    const batch = writeBatch(db);
    deactivateOtherActive(batch, items, ref.id, now, actorId);
    batch.set(ref, record);
    await batch.commit();
    return record;
  }

  await setDoc(ref, record);
  return record;
}

export async function updateAssessmentPeriod(
  id: string,
  input: AssessmentPeriodWriteInput,
  actorId: string
): Promise<AssessmentPeriod> {
  const db = requireDb();
  const items = await listAssessmentPeriods();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new AssessmentPeriodError("Periode tidak ditemukan.");
  }

  const normalized = normalizePeriodInput(input);
  assertUniqueNameYear(items, normalized.name, normalized.year, id);

  const now = new Date().toISOString();
  const next: AssessmentPeriod = {
    ...existing,
    ...normalized,
    updatedAt: now,
    updatedBy: actorId,
  };

  const batch = writeBatch(db);
  if (normalized.status === "active") {
    deactivateOtherActive(batch, items, id, now, actorId);
  }

  batch.update(doc(db, COLLECTIONS.assessmentPeriods, id), {
    name: normalized.name,
    year: normalized.year,
    startsAt: normalized.startsAt,
    endsAt: normalized.endsAt,
    status: normalized.status,
    updatedAt: now,
    updatedBy: actorId,
  });

  await batch.commit();
  return next;
}

function deactivateOtherActive(
  batch: ReturnType<typeof writeBatch>,
  items: AssessmentPeriod[],
  exceptId: string,
  now: string,
  actorId: string
) {
  const db = requireDb();
  for (const item of items) {
    if (item.id === exceptId || item.status !== "active") {
      continue;
    }

    batch.update(doc(db, COLLECTIONS.assessmentPeriods, item.id), {
      status: "draft",
      updatedAt: now,
      updatedBy: actorId,
    });
  }
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new AssessmentPeriodError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueNameYear(
  items: AssessmentPeriod[],
  name: string,
  year: number,
  exceptId?: string
) {
  const taken = items.some(
    (item) =>
      item.year === year &&
      item.name.toLowerCase() === name.toLowerCase() &&
      item.id !== exceptId
  );

  if (taken) {
    throw new AssessmentPeriodError(
      `Nama "${name}" sudah dipakai periode tahun ${year}.`
    );
  }
}

function mapPeriod(id: string, data: DocumentData): AssessmentPeriod {
  const rawStatus = String(data.status ?? "");
  const status = isAssessmentPeriodStatus(rawStatus) ? rawStatus : "draft";

  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    year: typeof data.year === "number" ? data.year : new Date().getFullYear(),
    startsAt: toDateInputValue(
      typeof data.startsAt === "string" ? data.startsAt : ""
    ),
    endsAt: toDateInputValue(typeof data.endsAt === "string" ? data.endsAt : ""),
    status,
    questionnaireId:
      typeof data.questionnaireId === "string" ? data.questionnaireId : null,
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
