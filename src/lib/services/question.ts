import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getActiveAssessmentPeriod } from "@/lib/services/assessment-period";
import { getKompetensiById, isKompetensiDimensi } from "@/lib/services/kompetensi";
import { listKompetensiLevels } from "@/lib/services/kompetensi-level";
import {
  deleteQuestionAnswerKeyInBatch,
  saveQuestionAnswerKeyInBatch,
} from "@/lib/services/question-answer-key";
import { listAllTestSessions } from "@/lib/services/test-session";
import { getTusiById } from "@/lib/services/tusi";
import type { KompetensiDimensi, Question, QuestionOption, QuestionType, UserRole } from "@/types";

const SORT_STEP = 10;
const DEFAULT_SCALE_MIN = 1;
const DEFAULT_SCALE_MAX = 5;
/** Batas item per writeBatch aksi massal (buang/pulih/hapus permanen) — aman di bawah limit 500 operasi/batch Firestore (hapus permanen = maks 2 operasi/soal). */
const MAX_BULK_ACTION_SIZE = 200;

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

export type MultipleChoiceOptionInput = {
  value: string;
  label: string;
};

export type QuestionWriteInput = {
  text: string;
  code: string;
  type: QuestionType;
  kompetensiId: string | null;
  tusiId: string | null;
  dimensi: KompetensiDimensi | null;
  isActive: boolean;
  sortOrder?: number;
  /** Wajib diisi kalau type === "multiple_choice", diabaikan untuk tipe lain. */
  multipleChoiceOptions?: MultipleChoiceOptionInput[];
  multipleChoiceCorrectValue?: string | null;
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

  let multipleChoiceOptions: MultipleChoiceOptionInput[] | undefined;
  let multipleChoiceCorrectValue: string | null | undefined;

  if (input.type === "multiple_choice") {
    const options = (input.multipleChoiceOptions ?? [])
      .map((item) => ({ value: item.value.trim(), label: item.label.trim() }))
      .filter((item) => item.label.length > 0);

    if (options.length < 2) {
      throw new QuestionError("Soal pilihan ganda butuh minimal 2 opsi.");
    }

    const uniqueValues = new Set(options.map((item) => item.value));
    if (uniqueValues.size !== options.length) {
      throw new QuestionError("Opsi jawaban tidak boleh duplikat.");
    }

    const correctValue = input.multipleChoiceCorrectValue?.trim() || null;
    if (!correctValue || !options.some((item) => item.value === correctValue)) {
      throw new QuestionError(
        "Tandai satu opsi sebagai kunci jawaban sebelum menyimpan."
      );
    }

    multipleChoiceOptions = options;
    multipleChoiceCorrectValue = correctValue;
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
    multipleChoiceOptions,
    multipleChoiceCorrectValue,
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
  const batch = writeBatch(db);
  const record = await buildQuestionWrite(batch, db, input, items, actorId);
  await batch.commit();

  return record;
}

/**
 * Impor massal (dipakai /admin/soal/import): SATU writeBatch untuk semua
 * soal + kunci jawabannya sekaligus, jadi benar-benar atomik — kalau satu
 * write gagal, tidak ada satu pun yang tersimpan. Dibatasi
 * MAX_IMPORT_BATCH_SIZE (lihat question-import.ts) supaya tidak melebihi
 * limit 500 operasi per writeBatch Firestore (tiap soal pilihan_ganda = 2
 * operasi: soal + kunci jawaban).
 */
export async function createQuestionsBatch(
  inputs: QuestionWriteInput[],
  actorId: string
): Promise<Question[]> {
  const db = requireDb();
  const items = await listQuestions();
  const batch = writeBatch(db);
  const records: Question[] = [];

  for (const input of inputs) {
    const record = await buildQuestionWrite(batch, db, input, items, actorId);
    records.push(record);
    items.push(record);
  }

  await batch.commit();
  return records;
}

/**
 * Logika inti satu soal (validasi relasi, kode unik, skala, urutan, opsi,
 * kunci jawaban) dipakai bersama oleh createQuestion (satu soal, batch
 * sendiri) dan createQuestionsBatch (banyak soal, satu batch bersama) —
 * supaya keduanya benar-benar jalur yang sama, bukan implementasi ganda.
 * `items` dipakai untuk cek kode unik + urutan berikutnya; caller batch
 * WAJIB menambahkan record hasil ke `items` sebelum memanggil lagi untuk
 * soal berikutnya.
 */
async function buildQuestionWrite(
  batch: ReturnType<typeof writeBatch>,
  db: ReturnType<typeof requireDb>,
  input: QuestionWriteInput,
  items: Question[],
  actorId: string
): Promise<Question> {
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
    options: resolveOptions(normalized.type, normalized.multipleChoiceOptions),
    sortOrder: normalized.sortOrder ?? nextQuestionSortOrder(items),
    isActive: normalized.isActive,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
  };

  batch.set(ref, record);
  await applyAnswerKey(batch, db, ref.id, normalized, actorId);

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
  const nextOptions = resolveOptions(normalized.type, normalized.multipleChoiceOptions);

  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.questions, id), {
    code: normalized.code,
    text: normalized.text,
    type: normalized.type,
    kompetensiId: normalized.kompetensiId,
    tusiId: normalized.tusiId,
    dimensi: normalized.dimensi,
    scaleMin: scale.scaleMin,
    scaleMax: scale.scaleMax,
    options: nextOptions,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  });

  if (normalized.type === "multiple_choice") {
    await applyAnswerKey(batch, db, id, normalized, actorId);
  } else if (existing.type === "multiple_choice") {
    // Tipe diganti dari pilihan ganda ke tipe lain — kunci lama sudah tidak relevan.
    deleteQuestionAnswerKeyInBatch(batch, db, id);
  }

  await batch.commit();

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
    options: nextOptions,
    sortOrder: nextSort,
    isActive: normalized.isActive,
    updatedAt: now,
    updatedBy: actorId,
  };
}

/**
 * Menulis question_answer_keys di batch yang sama dengan soalnya, ditandai
 * dengan periode aktif SAAT INI. Kalau soal ini dipakai lagi di periode
 * berikutnya, admin perlu menyimpan ulang (edit lalu simpan) supaya
 * periodeId kunci ikut pindah — kalau tidak, kunci lama tetap menunjuk ke
 * periode lama dan test_sessions periode baru tidak akan bisa membukanya.
 */
async function applyAnswerKey(
  batch: ReturnType<typeof writeBatch>,
  db: ReturnType<typeof requireDb>,
  questionId: string,
  normalized: QuestionWriteInput,
  actorId: string
): Promise<void> {
  if (normalized.type !== "multiple_choice" || !normalized.multipleChoiceCorrectValue) {
    return;
  }

  const activePeriod = await getActiveAssessmentPeriod();
  if (!activePeriod) {
    throw new QuestionError(
      "Tidak ada periode penilaian aktif. Aktifkan satu periode dulu sebelum menyimpan soal pilihan ganda."
    );
  }

  saveQuestionAnswerKeyInBatch(batch, db, {
    questionId,
    correctValue: normalized.multipleChoiceCorrectValue,
    periodeId: activePeriod.id,
    actorId,
  });
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

/**
 * Buang ke Tong Sampah: paksa isActive:false (soal otomatis hilang dari
 * kuesioner lewat filter isActive yang sudah ada di mana-mana — self
 * assessment, Tes Pengetahuan — tanpa menyentuh logika di sana) + tandai
 * trashedAt. Dipecah per MAX_BULK_ACTION_SIZE item supaya aman di bawah
 * limit 500 operasi/writeBatch Firestore.
 */
export async function trashQuestionsInBatch(
  ids: string[],
  actorId: string
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = requireDb();
  const now = new Date().toISOString();

  for (let offset = 0; offset < ids.length; offset += MAX_BULK_ACTION_SIZE) {
    const chunk = ids.slice(offset, offset + MAX_BULK_ACTION_SIZE);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.update(doc(db, COLLECTIONS.questions, id), {
        trashedAt: now,
        isActive: false,
        updatedAt: now,
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }
}

/**
 * Pulihkan dari Tong Sampah. Status aktif TIDAK dikembalikan otomatis —
 * soal muncul kembali di daftar utama berstatus Nonaktif, admin
 * mengaktifkan lagi secara sadar lewat aksi Aktifkan yang sudah ada.
 */
export async function restoreQuestionsInBatch(
  ids: string[],
  actorId: string
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = requireDb();
  const now = new Date().toISOString();

  for (let offset = 0; offset < ids.length; offset += MAX_BULK_ACTION_SIZE) {
    const chunk = ids.slice(offset, offset + MAX_BULK_ACTION_SIZE);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.update(doc(db, COLLECTIONS.questions, id), {
        trashedAt: null,
        updatedAt: now,
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }
}

/**
 * Dipakai BAIK untuk menentukan apakah tombol "Hapus Permanen" muncul di
 * UI MAUPUN diverifikasi ulang di dalam deleteQuestionsPermanently()
 * sebelum menulis apa pun — jangan bergantung pada state UI yang mungkin
 * basi. Mengecek assessment_answers (semua tipe soal) dan, khusus
 * pilihan_ganda, test_sessions (jawabannya tersimpan di dalam array
 * dokumen, bukan koleksi terpisah, jadi discan di sisi klien).
 */
export async function hasQuestionBeenAnswered(
  question: Pick<Question, "id" | "type">
): Promise<boolean> {
  const db = requireDb();

  const answerSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.assessmentAnswers),
      where("questionId", "==", question.id),
      limit(1)
    )
  );
  if (!answerSnap.empty) {
    return true;
  }

  if (question.type === "multiple_choice") {
    const sessions = await listAllTestSessions();
    return sessions.some((session) =>
      session.answers.some((answer) => answer.questionId === question.id)
    );
  }

  return false;
}

export type DeleteQuestionsPermanentlyResult = {
  deletedCount: number;
};

/**
 * Hapus permanen — HANYA super_admin, HANYA soal yang sudah ada di Tong
 * Sampah, HANYA yang belum pernah dijawab siapa pun (diverifikasi ulang
 * di sini, bukan percaya parameter dari UI). Semua-atau-tidak-sama-sekali:
 * kalau SATU saja tidak memenuhi syarat, tidak ada yang terhapus. Soal
 * pilihan ganda ikut menghapus question_answer_keys-nya di batch yang
 * sama supaya tidak ada kunci yatim.
 */
export async function deleteQuestionsPermanently(
  ids: string[],
  actorRole: UserRole
): Promise<DeleteQuestionsPermanentlyResult> {
  if (actorRole !== "super_admin") {
    throw new QuestionError("Hanya Super Admin yang boleh menghapus soal permanen.");
  }

  if (ids.length === 0) {
    return { deletedCount: 0 };
  }

  const db = requireDb();
  const allQuestions = await listQuestions();
  const targets = ids.map((id) => {
    const found = allQuestions.find((item) => item.id === id);
    if (!found) {
      throw new QuestionError("Salah satu soal tidak ditemukan.");
    }
    return found;
  });

  const notTrashed = targets.find((item) => !item.trashedAt);
  if (notTrashed) {
    throw new QuestionError(
      `Soal "${notTrashed.text}" belum ada di Tong Sampah — buang dulu sebelum menghapus permanen.`
    );
  }

  for (const target of targets) {
    if (await hasQuestionBeenAnswered(target)) {
      throw new QuestionError(
        `Soal "${target.text}" sudah pernah dijawab pegawai — tidak bisa dihapus permanen.`
      );
    }
  }

  for (let offset = 0; offset < targets.length; offset += MAX_BULK_ACTION_SIZE) {
    const chunk = targets.slice(offset, offset + MAX_BULK_ACTION_SIZE);
    const batch = writeBatch(db);
    for (const target of chunk) {
      batch.delete(doc(db, COLLECTIONS.questions, target.id));
      if (target.type === "multiple_choice") {
        deleteQuestionAnswerKeyInBatch(batch, db, target.id);
      }
    }
    await batch.commit();
  }

  return { deletedCount: targets.length };
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

function resolveOptions(
  type: QuestionType,
  multipleChoiceOptions?: MultipleChoiceOptionInput[]
): QuestionOption[] | null {
  if (type === "yes_no") {
    return YES_NO_OPTIONS;
  }

  if (type === "multiple_choice") {
    // score sengaja tidak diisi (null) — kebenaran jawaban hidup di
    // question_answer_keys, bukan di sini, supaya tidak terbaca semua orang.
    return (multipleChoiceOptions ?? []).map((item) => ({
      value: item.value,
      label: item.label,
      score: null,
    }));
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
    trashedAt: toIso(data.trashedAt),
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
