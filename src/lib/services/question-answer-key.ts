import {
  doc,
  getDoc,
  type DocumentData,
  type Firestore,
  type WriteBatch,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { QuestionAnswerKey } from "@/types";

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
