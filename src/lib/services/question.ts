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
import { getKompetensiById, isKompetensiDimensi } from "@/lib/services/kompetensi";
import { listKompetensiLevels } from "@/lib/services/kompetensi-level";
import { getTusiById } from "@/lib/services/tusi";
import type { KompetensiDimensi, Question, QuestionOption, QuestionType } from "@/types";

const SORT_STEP = 10;
const DEFAULT_SCALE_MIN = 1;
const DEFAULT_SCALE_MAX = 5;

export const NO_RELATION_VALUE = "__none__";
const NO_DIMENSI_VALUE = "__none_dimensi__";

export const QUESTION_TYPE_OPTIONS: Array<{
  value: QuestionType;
  label: string;
}> = [
  { value: "likert", label: "Skala" },
  { value: "multiple_choice", label: "Pilihan ganda" },
  { value: "yes_no", label: "Ya / Tidak" },
];

export const YES_NO_OPTIONS: QuestionOption[] = [
  { value: "ya", label: "Ya", score: 1 },
  { value: "tidak", label: "Tidak", score: 0 },
];

export class QuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionError";
  }
}

export type QuestionWriteInput = {
  text: string;
  code: string;
  type: QuestionType;
  kompetensiId: string | null;
  tusiId: string | null;
  dimensi: KompetensiDimensi | null;
  isActive: boolean;
  sortOrder?: number;
};

export function isQuestionType(value: string): value is QuestionType {
  return (
    value === "likert" ||
    value === "multiple_choice" ||
    value === "yes_no" ||
    value === "open_text"
  );
}

export function getQuestionTypeLabel(value: QuestionType): string {
  if (value === "open_text") {
    return "Isian";
  }

  return (
    QUESTION_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value
  );
}

export function sortQuestionList(items: Question[]): Question[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.text.localeCompare(b.text, "id")
    );
}

export function nextQuestionSortOrder(items: Question[]): number {
  if (items.length === 0) {
    return SORT_STEP;
  }

  return Math.max(...items.map((item) => item.sortOrder)) + SORT_STEP;
}

export function normalizeQuestionInput(
  input: QuestionWriteInput
): QuestionWriteInput {
  const text = input.text.trim();
  const code = input.code.trim().toUpperCase();
  const kompetensiId = input.kompetensiId?.trim() || null;
  const tusiId = input.tusiId?.trim() || null;
  const dimensi = input.dimensi;

  if (text.length < 5) {
    throw new QuestionError("Teks soal minimal 5 karakter.");
  }

  if (code && !/^[A-Z0-9._-]+$/.test(code)) {
    throw new QuestionError(
      "Kode hanya boleh huruf, angka, titik, strip, atau garis bawah."
    );
  }

  if (!isQuestionType(input.type) || input.type === "open_text") {
    throw new QuestionError("Tipe soal tidak valid.");
  }

  if (dimensi && !isKompetensiDimensi(dimensi)) {
    throw new QuestionError("Dimensi tidak valid.");
  }

  const sortOrder =
    input.sortOrder === undefined ? undefined : Number(input.sortOrder);
  if (
    sortOrder !== undefined &&
    (!Number.isInteger(sortOrder) || sortOrder < 1)
  ) {
    throw new QuestionError("Urutan harus bilangan bulat minimal 1.");
  }

  return {
    text,
    code,
    type: input.type,
    kompetensiId,
    tusiId,
    dimensi,
    isActive: input.isActive,
    sortOrder,
  };
}

export function mapQuestionError(error: unknown): string {
  if (error instanceof QuestionError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah bank soal.";
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

export async function listQuestions(): Promise<Question[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.questions));
  return sortQuestionList(
    snapshot.docs.map((item) => mapQuestion(item.id, item.data()))
  );
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.questions, id));
  if (!snapshot.exists()) {
    return null;
  }

  return mapQuestion(snapshot.id, snapshot.data());
}

export async function createQuestion(
  input: QuestionWriteInput,
  actorId: string
): Promise<Question> {
  const db = requireDb();
  const items = await listQuestions();
  const normalized = await validateRelations(normalizeQuestionInput(input));
  assertUniqueCode(items, normalized.code);

  const scale = await resolveScaleRange(normalized.type);
  const ref = doc(collection(db, COLLECTIONS.questions));
  const now = new Date().toISOString();
  const record: Question = {
    id: ref.id,
    code: normalized.code,
    text: normalized.text,
    type: normalized.type,
    kompetensiId: normalized.kompetensiId,
    tusiId: normalized.tusiId,
    dimensi: normalized.dimensi,
    scaleMin: scale.scaleMin,
    scaleMax: scale.scaleMax,
    options: resolveOptions(normalized.type),
    sortOrder: normalized.sortOrder ?? nextQuestionSortOrder(items),
    isActive: normalized.isActive,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  await setDoc(ref, record);
  return record;
}

export async function updateQuestion(
  id: string,
  input: QuestionWriteInput,
  actorId: string
): Promise<Question> {
  const db = requireDb();
  const items = await listQuestions();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    throw new QuestionError("Soal tidak ditemukan.");
  }

  const normalized = await validateRelations(normalizeQuestionInput(input));
  assertUniqueCode(items, normalized.code, id);

  const scale = await resolveScaleRange(normalized.type);
  const now = new Date().toISOString();
  const nextSort = normalized.sortOrder ?? existing.sortOrder;

  await updateDoc(doc(db, COLLECTIONS.questions, id), {
    code: normalized.code,
    text: normalized.text,
    type: normalized.type,
    kompetensiId: normalized.kompetensiId,
    tusiId: normalized.tusiId,
    dimensi: normalized.dimensi,
    scaleMin: scale.scaleMin,
    scaleMax: scale.scaleMax,
    options: resolveOptions(normalized.type),
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  return {
    ...existing,
    code: normalized.code,
    text: normalized.text,
    type: normalized.type,
    kompetensiId: normalized.kompetensiId,
    tusiId: normalized.tusiId,
    dimensi: normalized.dimensi,
    scaleMin: scale.scaleMin,
    scaleMax: scale.scaleMax,
    options: resolveOptions(normalized.type),
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export async function setQuestionActive(
  id: string,
  isActive: boolean,
  actorId: string
): Promise<void> {
  const existing = await getQuestionById(id);
  if (!existing) {
    throw new QuestionError("Soal tidak ditemukan.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.questions, id), {
    isActive,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });
}

export { NO_DIMENSI_VALUE };

async function validateRelations(
  input: QuestionWriteInput
): Promise<QuestionWriteInput> {
  if (input.kompetensiId) {
    const kompetensi = await getKompetensiById(input.kompetensiId);
    if (!kompetensi) {
      throw new QuestionError("Kompetensi tidak ditemukan.");
    }
  }

  if (input.tusiId) {
    const tusi = await getTusiById(input.tusiId);
    if (!tusi) {
      throw new QuestionError("TUSI tidak ditemukan.");
    }
  }

  return input;
}

async function resolveScaleRange(type: QuestionType): Promise<{
  scaleMin: number | null;
  scaleMax: number | null;
}> {
  if (type !== "likert") {
    return { scaleMin: null, scaleMax: null };
  }

  const levels = (await listKompetensiLevels()).filter((item) => item.isActive);
  if (levels.length === 0) {
    return { scaleMin: DEFAULT_SCALE_MIN, scaleMax: DEFAULT_SCALE_MAX };
  }

  return {
    scaleMin: Math.min(...levels.map((item) => item.level)),
    scaleMax: Math.max(...levels.map((item) => item.level)),
  };
}

function resolveOptions(type: QuestionType): QuestionOption[] | null {
  if (type === "yes_no") {
    return YES_NO_OPTIONS;
  }

  if (type === "multiple_choice") {
    return [];
  }

  return null;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new QuestionError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function assertUniqueCode(
  items: Question[],
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
    throw new QuestionError(`Kode "${code}" sudah dipakai soal lain.`);
  }
}

function mapQuestion(id: string, data: DocumentData): Question {
  const rawType = String(data.type ?? "likert");
  const type = isQuestionType(rawType) ? rawType : "likert";
  const rawDimensi = String(data.dimensi ?? "");

  return {
    id,
    code: typeof data.code === "string" ? data.code : "",
    text: typeof data.text === "string" ? data.text : "",
    type,
    kompetensiId: typeof data.kompetensiId === "string" ? data.kompetensiId : null,
    tusiId: typeof data.tusiId === "string" ? data.tusiId : null,
    dimensi: isKompetensiDimensi(rawDimensi) ? rawDimensi : null,
    scaleMin: typeof data.scaleMin === "number" ? data.scaleMin : null,
    scaleMax: typeof data.scaleMax === "number" ? data.scaleMax : null,
    options: mapOptions(data.options),
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function mapOptions(value: unknown): QuestionOption[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const option = item as { value?: unknown; label?: unknown; score?: unknown };
      if (typeof option.value !== "string" || typeof option.label !== "string") {
        return null;
      }

      return {
        value: option.value,
        label: option.label,
        score: typeof option.score === "number" ? option.score : null,
      };
    })
    .filter((item): item is QuestionOption => item !== null);
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
