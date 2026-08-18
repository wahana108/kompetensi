import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentData,
  type Firestore,
  type WriteBatch,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { QuestionAnswerKey, UserRole } from "@/types";

/** Batas operasi per writeBatch Firestore. */
const BATCH_WRITE_LIMIT = 500;

export class QuestionAnswerKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionAnswerKeyError";
  }
}

export function mapQuestionAnswerKeyError(error: unknown): string {
  if (error instanceof QuestionAnswerKeyError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Kunci jawaban belum bisa dibaca — tes belum diselesaikan.";
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

/** Admin-only dalam praktiknya (rule membatasi baca ke admin/penyelesai tes). */
export async function getQuestionAnswerKey(
  questionId: string
): Promise<QuestionAnswerKey | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.questionAnswerKeys, questionId));
  if (!snapshot.exists()) {
    return null;
  }

  return mapAnswerKey(snapshot.data());
}

/** Dipanggil dari question.ts (createQuestion/updateQuestion) di batch yang sama. */
export function saveQuestionAnswerKeyInBatch(
  batch: WriteBatch,
  db: Firestore,
  input: {
    questionId: string;
    correctValue: string;
    periodeId: string;
    actorId: string;
  }
): void {
  const record: QuestionAnswerKey = {
    questionId: input.questionId,
    correctValue: input.correctValue,
    periodeId: input.periodeId,
    updatedAt: new Date().toISOString(),
    updatedBy: input.actorId,
  };

  batch.set(doc(db, COLLECTIONS.questionAnswerKeys, input.questionId), record);
}

export function deleteQuestionAnswerKeyInBatch(
  batch: WriteBatch,
  db: Firestore,
  questionId: string
): void {
  batch.delete(doc(db, COLLECTIONS.questionAnswerKeys, questionId));
}

/** Admin-only dalam praktiknya (rule question_answer_keys.read: isAdmin() tidak bergantung resource, jadi list query aman untuk admin/super_admin). */
export async function listQuestionAnswerKeys(): Promise<QuestionAnswerKey[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.questionAnswerKeys));
  return snapshot.docs.map((item) => mapAnswerKey(item.data()));
}

export function countStaleAnswerKeys(
  keys: QuestionAnswerKey[],
  activePeriodId: string
): number {
  return keys.filter((key) => key.periodeId !== activePeriodId).length;
}

export type RefreshAnswerKeysResult = {
  updatedCount: number;
};

/**
 * Menulis ulang periodeId SEMUA question_answer_keys yang belum menunjuk
 * periode aktif, dalam batch berurutan (maks BATCH_WRITE_LIMIT operasi per
 * writeBatch — Firestore menolak batch > 500 operasi). Tidak menyentuh
 * dokumen soal (questions) sama sekali, hanya kunci jawabannya.
 *
 * Pembatasan "hanya Super Admin" SENGAJA hanya ditegakkan di lapisan ini
 * (aplikasi), BUKAN di firestore.rules — rule question_answer_keys.write
 * masih `isAdmin()` (mengizinkan admin biasa juga), dan itu TIDAK diubah
 * sesuai instruksi "jangan sentuh firestore.rules". Artinya seorang admin
 * (bukan super_admin) yang menulis langsung ke Firestore lewat jalur lain
 * (bukan UI/fungsi ini) secara teknis masih lolos rules — dicatat sebagai
 * batas yang diketahui di konteks.md, bukan disembunyikan.
 */
export async function refreshAnswerKeysToPeriod(
  activePeriodId: string,
  actorId: string,
  actorRole: UserRole
): Promise<RefreshAnswerKeysResult> {
  if (actorRole !== "super_admin") {
    throw new QuestionAnswerKeyError(
      "Hanya Super Admin yang boleh menyegarkan kunci jawaban."
    );
  }

  const db = requireDb();
  const keys = await listQuestionAnswerKeys();
  const stale = keys.filter((key) => key.periodeId !== activePeriodId);

  if (stale.length === 0) {
    return { updatedCount: 0 };
  }

  const now = new Date().toISOString();
  for (let offset = 0; offset < stale.length; offset += BATCH_WRITE_LIMIT) {
    const chunk = stale.slice(offset, offset + BATCH_WRITE_LIMIT);
    const batch = writeBatch(db);
    for (const key of chunk) {
      batch.update(doc(db, COLLECTIONS.questionAnswerKeys, key.questionId), {
        periodeId: activePeriodId,
        updatedAt: now,
        updatedBy: actorId,
      });
    }
    await batch.commit();
  }

  return { updatedCount: stale.length };
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new QuestionAnswerKeyError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function mapAnswerKey(data: DocumentData): QuestionAnswerKey {
  return {
    questionId: typeof data.questionId === "string" ? data.questionId : "",
    correctValue: typeof data.correctValue === "string" ? data.correctValue : "",
    periodeId: typeof data.periodeId === "string" ? data.periodeId : "",
    updatedAt: toIso(data.updatedAt),
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
