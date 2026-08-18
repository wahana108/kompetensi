import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getQuestionAnswerKey } from "@/lib/services/question-answer-key";
import type {
  TestSession,
  TestSessionAnswer,
  TestSessionCompetencyScore,
} from "@/types";

export class TestSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestSessionError";
  }
}

export function mapTestSessionError(error: unknown): string {
  if (error instanceof TestSessionError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengakses tes ini, atau tes sudah pernah dikerjakan.";
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

export function testSessionId(employeeId: string, periodId: string): string {
  return `${employeeId}_${periodId}`;
}

export async function getTestSession(
  employeeId: string,
  periodId: string
): Promise<TestSession | null> {
  const db = requireDb();
  const snapshot = await getDoc(
    doc(db, COLLECTIONS.testSessions, testSessionId(employeeId, periodId))
  );
  if (!snapshot.exists()) {
    return null;
  }

  return mapTestSession(snapshot.id, snapshot.data());
}

export async function listTestSessionsForPeriod(
  periodId: string
): Promise<TestSession[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.testSessions), where("periodId", "==", periodId))
  );

  return snapshot.docs.map((item) => mapTestSession(item.id, item.data()));
}

/**
 * Alur 2 fase supaya kunci jawaban tidak pernah terbaca sebelum tes selesai:
 * (1) tulis jawaban mentah dengan status "submitted" dan skorPerKompetensi
 *     null — rule mengunci dokumen ini setelahnya (tidak bisa diubah lagi
 *     selain sekali transisi skor null -> terisi);
 * (2) SETELAH tulisan itu berhasil, rule question_answer_keys baru
 *     mengizinkan baca (karena test_sessions milik sendiri sudah
 *     "submitted") — baru di sinilah kunci dibaca & skor dihitung;
 * (3) tulis skor SEKALI ke dokumen yang sama.
 * Skor dihitung di client (tidak ada Cloud Functions) — lihat catatan
 * utang teknis di konteks.md soal batas keamanan pendekatan ini.
 */
export async function submitTestSession(input: {
  employeeId: string;
  periodId: string;
  answers: TestSessionAnswer[];
}): Promise<TestSession> {
  if (input.answers.length === 0) {
    throw new TestSessionError("Belum ada jawaban untuk dikirim.");
  }

  const db = requireDb();
  const id = testSessionId(input.employeeId, input.periodId);
  const ref = doc(db, COLLECTIONS.testSessions, id);
  const now = new Date().toISOString();

  const draft: TestSession = {
    id,
    employeeId: input.employeeId,
    periodId: input.periodId,
    status: "submitted",
    answers: input.answers,
    skorPerKompetensi: null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, draft);

  const skorPerKompetensi = await gradeAnswers(input.answers);
  const updatedAt = new Date().toISOString();

  await updateDoc(ref, { skorPerKompetensi, updatedAt });

  return { ...draft, skorPerKompetensi, updatedAt };
}

async function gradeAnswers(
  answers: TestSessionAnswer[]
): Promise<TestSessionCompetencyScore[]> {
  const grouped = new Map<string, { correct: number; total: number }>();

  for (const answer of answers) {
    if (!answer.kompetensiId) {
      continue;
    }

    const key = await getQuestionAnswerKey(answer.questionId);
    const stat = grouped.get(answer.kompetensiId) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (key && key.correctValue === answer.selectedValue) {
      stat.correct += 1;
    }
    grouped.set(answer.kompetensiId, stat);
  }

  return Array.from(grouped.entries()).map(([kompetensiId, stat]) => ({
    kompetensiId,
    jumlahBenar: stat.correct,
    jumlahSoal: stat.total,
    persenBenar: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
  }));
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new TestSessionError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function mapTestSession(id: string, data: DocumentData): TestSession {
  return {
    id,
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    periodId: typeof data.periodId === "string" ? data.periodId : "",
    status: "submitted",
    answers: mapAnswers(data.answers),
    skorPerKompetensi: mapSkor(data.skorPerKompetensi),
    submittedAt: toIso(data.submittedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapAnswers(value: unknown): TestSessionAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const raw = item as Record<string, unknown>;
      if (typeof raw.questionId !== "string" || typeof raw.selectedValue !== "string") {
        return null;
      }
      return {
        questionId: raw.questionId,
        kompetensiId: typeof raw.kompetensiId === "string" ? raw.kompetensiId : null,
        selectedValue: raw.selectedValue,
      };
    })
    .filter((item): item is TestSessionAnswer => item !== null);
}

function mapSkor(value: unknown): TestSessionCompetencyScore[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const raw = item as Record<string, unknown>;
      if (typeof raw.kompetensiId !== "string") {
        return null;
      }
      return {
        kompetensiId: raw.kompetensiId,
        jumlahBenar: typeof raw.jumlahBenar === "number" ? raw.jumlahBenar : 0,
        jumlahSoal: typeof raw.jumlahSoal === "number" ? raw.jumlahSoal : 0,
        persenBenar: typeof raw.persenBenar === "number" ? raw.persenBenar : 0,
      };
    })
    .filter((item): item is TestSessionCompetencyScore => item !== null);
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
