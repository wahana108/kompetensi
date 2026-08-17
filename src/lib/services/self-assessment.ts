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
import {
  getAssessmentPeriodById,
  isPeriodFillable,
  listAssessmentPeriods,
} from "@/lib/services/assessment-period";
import { listQuestions } from "@/lib/services/question";
import { listTusi } from "@/lib/services/tusi";
import type {
  Assessment,
  AssessmentAnswer,
  AssessmentPeriod,
  Question,
  Tusi,
  UserProfile,
} from "@/types";

export class SelfAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelfAssessmentError";
  }
}

export function selfAssessmentId(periodId: string, employeeId: string): string {
  return `self_${periodId}_${employeeId}`;
}

export function assessmentAnswerId(
  assessmentId: string,
  questionId: string
): string {
  return `${assessmentId}_${questionId}`;
}

export function mapSelfAssessmentError(error: unknown): string {
  if (error instanceof SelfAssessmentError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah penilaian ini.";
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

/** Jika soal TUSI kurang dari ini, dilengkapi soal kompetensi lalu soal umum. */
export const SELF_ASSESSMENT_MIN_QUESTIONS = 5;

export type QuestionMatch = "tusi" | "kompetensi" | "umum" | "lainnya" | "tersimpan";

export type SelfAssessmentQuestionSet = {
  questions: Question[];
  matches: Record<string, QuestionMatch>;
  source: "tusi" | "campuran" | "semua";
};

export async function listActiveQuestions(): Promise<Question[]> {
  const questions = await listQuestions();
  return questions.filter((item) => item.isActive);
}

export async function listQuestionsForSelfAssessment(input: {
  tusiIds: string[];
  keepQuestionIds?: string[];
}): Promise<SelfAssessmentQuestionSet> {
  const keepIds = input.keepQuestionIds ?? [];
  const [allQuestions, tusiItems] = await Promise.all([
    listQuestions(),
    input.tusiIds.length > 0 ? listTusi() : Promise.resolve([] as Tusi[]),
  ]);

  return selectQuestionsForSelfAssessment(allQuestions, {
    tusiIds: input.tusiIds,
    kompetensiIds: collectKompetensiIdsFromTusi(tusiItems, input.tusiIds),
    keepQuestionIds: keepIds,
  });
}

export function collectKompetensiIdsFromTusi(
  tusiItems: Tusi[],
  tusiIds: string[]
): string[] {
  const wanted = new Set(tusiIds);
  const kompetensiIds = new Set<string>();

  for (const item of tusiItems) {
    if (!wanted.has(item.id)) {
      continue;
    }

    for (const kompetensiId of item.kompetensiIds) {
      kompetensiIds.add(kompetensiId);
    }
  }

  return [...kompetensiIds];
}

export function selectQuestionsForSelfAssessment(
  allQuestions: Question[],
  input: {
    tusiIds: string[];
    kompetensiIds: string[];
    keepQuestionIds: string[];
  }
): SelfAssessmentQuestionSet {
  const tusiSet = new Set(input.tusiIds);
  const kompetensiSet = new Set(input.kompetensiIds);
  const keepSet = new Set(input.keepQuestionIds);
  const active = allQuestions.filter(
    (item) => item.isActive && isAnswerableQuestion(item)
  );
  const matches: Record<string, QuestionMatch> = {};

  if (tusiSet.size === 0) {
    const questions = mergeKeptQuestions(active, allQuestions, keepSet, matches);
    return { questions, matches, source: "semua" };
  }

  const tusiQuestions = active.filter(
    (item) => item.tusiId && tusiSet.has(item.tusiId)
  );
  const kompetensiQuestions = active.filter(
    (item) =>
      item.kompetensiId &&
      kompetensiSet.has(item.kompetensiId) &&
      !(item.tusiId && tusiSet.has(item.tusiId))
  );
  const generalQuestions = active.filter(
    (item) => !item.tusiId && !item.kompetensiId
  );
  const otherQuestions = active.filter(
    (item) =>
      !tusiQuestions.includes(item) &&
      !kompetensiQuestions.includes(item) &&
      !generalQuestions.includes(item)
  );

  const picked: Question[] = [...tusiQuestions];
  for (const item of tusiQuestions) {
    matches[item.id] = "tusi";
  }

  if (picked.length < SELF_ASSESSMENT_MIN_QUESTIONS) {
    appendUntil(picked, kompetensiQuestions, SELF_ASSESSMENT_MIN_QUESTIONS, matches, "kompetensi");
  }

  if (picked.length < SELF_ASSESSMENT_MIN_QUESTIONS) {
    appendUntil(picked, generalQuestions, SELF_ASSESSMENT_MIN_QUESTIONS, matches, "umum");
  }

  if (picked.length === 0) {
    for (const item of [...otherQuestions, ...active]) {
      if (matches[item.id]) {
        continue;
      }
      picked.push(item);
      matches[item.id] = "lainnya";
    }
  }

  const questions = mergeKeptQuestions(picked, allQuestions, keepSet, matches);
  const source =
    Object.values(matches).every((item) => item === "tusi" || item === "tersimpan") &&
    tusiQuestions.length > 0
      ? "tusi"
      : "campuran";

  return { questions, matches, source };
}

function appendUntil(
  target: Question[],
  extras: Question[],
  minCount: number,
  matches: Record<string, QuestionMatch>,
  match: QuestionMatch
) {
  for (const item of extras) {
    if (target.length >= minCount) {
      break;
    }

    if (matches[item.id]) {
      continue;
    }

    target.push(item);
    matches[item.id] = match;
  }
}

function mergeKeptQuestions(
  selected: Question[],
  allQuestions: Question[],
  keepIds: Set<string>,
  matches: Record<string, QuestionMatch>
): Question[] {
  const byId = new Map(selected.map((item) => [item.id, item]));

  for (const id of keepIds) {
    if (byId.has(id)) {
      continue;
    }

    const kept = allQuestions.find((item) => item.id === id);
    if (!kept) {
      continue;
    }

    byId.set(kept.id, kept);
    matches[kept.id] = matches[kept.id] ?? "tersimpan";
  }

  return [...byId.values()].sort((a, b) => {
    const rank = (id: string) => matchRank(matches[id] ?? "lainnya");
    return rank(a.id) - rank(b.id) || a.sortOrder - b.sortOrder;
  });
}

function matchRank(match: QuestionMatch): number {
  switch (match) {
    case "tusi":
      return 0;
    case "kompetensi":
      return 1;
    case "umum":
      return 2;
    case "tersimpan":
      return 3;
    default:
      return 4;
  }
}

export async function listEmployeeAssessments(
  employeeId: string
): Promise<Assessment[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.assessments),
      where("employeeId", "==", employeeId)
    )
  );

  return snapshot.docs.map((item) => mapAssessment(item.id, item.data()));
}

export async function listEmployeePeriodCards(
  employeeId: string
): Promise<EmployeePeriodCard[]> {
  const [periods, assessments] = await Promise.all([
    listAssessmentPeriods(),
    listEmployeeAssessments(employeeId),
  ]);

  const assessmentByPeriod = new Map(
    assessments
      .filter((item) => item.type === "self")
      .map((item) => [item.periodId, item])
  );

  return periods
    .filter((period) => {
      if (period.status === "active") {
        return true;
      }

      return assessmentByPeriod.has(period.id);
    })
    .map((period) => {
      const assessment = assessmentByPeriod.get(period.id) ?? null;
      return {
        period,
        assessment,
        fillable: isPeriodFillable(period) && assessment?.status !== "submitted",
      };
    });
}

export async function getSelfAssessment(
  periodId: string,
  employeeId: string
): Promise<Assessment | null> {
  const db = requireDb();
  try {
    const snapshot = await getDoc(
      doc(db, COLLECTIONS.assessments, selfAssessmentId(periodId, employeeId))
    );
    if (!snapshot.exists()) {
      return null;
    }

    return mapAssessment(snapshot.id, snapshot.data());
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "permission-denied"
    ) {
      return null;
    }
    throw error;
  }
}

export async function getOrCreateSelfAssessment(
  period: AssessmentPeriod,
  profile: UserProfile
): Promise<Assessment> {
  if (!isPeriodFillable(period)) {
    throw new SelfAssessmentError(
      "Periode ini tidak sedang dibuka untuk pengisian."
    );
  }

  const existing = await getSelfAssessment(period.id, profile.id);
  if (existing) {
    return existing;
  }

  const db = requireDb();
  const now = new Date().toISOString();
  const id = selfAssessmentId(period.id, profile.id);
  const record: Assessment = {
    id,
    periodId: period.id,
    employeeId: profile.id,
    assessorId: profile.id,
    type: "self",
    status: "draft",
    assignment: {
      unitKerjaId: profile.unitKerjaId ?? null,
      jabatanId: profile.jabatanId ?? null,
      pangkatId: profile.pangkatId ?? null,
      tusiIds: Array.isArray(profile.tusiIds) ? profile.tusiIds : [],
      capturedAt: now,
    },
    overallScore: null,
    recommendationNote: null,
    dimensionScores: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: profile.id,
    updatedBy: profile.id,
  };

  await setDoc(doc(db, COLLECTIONS.assessments, id), record);
  return record;
}


export async function listAssessmentAnswers(
  assessmentId: string
): Promise<AssessmentAnswer[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.assessmentAnswers),
      where("assessmentId", "==", assessmentId)
    )
  );

  return snapshot.docs.map((item) => mapAnswer(item.id, item.data()));
}

export async function saveSelfAssessmentAnswer(input: {
  assessment: Assessment;
  question: Question;
  value: string | number;
  actorId: string;
}): Promise<AssessmentAnswer> {
  if (input.assessment.status === "submitted") {
    throw new SelfAssessmentError(
      "Penilaian sudah dikirim dan tidak bisa diubah."
    );
  }

  const period = await getAssessmentPeriodById(input.assessment.periodId);
  if (!period || !isPeriodFillable(period)) {
    throw new SelfAssessmentError("Periode sudah tidak bisa diisi.");
  }

  const score = resolveScore(input.question, input.value);
  const db = requireDb();
  const id = assessmentAnswerId(input.assessment.id, input.question.id);
  const record: AssessmentAnswer = {
    id,
    assessmentId: input.assessment.id,
    questionId: input.question.id,
    kompetensiId: input.question.kompetensiId,
    value: input.value,
    score,
    note: null,
  };

  await setDoc(doc(db, COLLECTIONS.assessmentAnswers, id), record);

  await updateDoc(doc(db, COLLECTIONS.assessments, input.assessment.id), {
    updatedAt: new Date().toISOString(),
    updatedBy: input.actorId,
  });

  return record;
}

export async function submitSelfAssessment(
  assessment: Assessment,
  actorId: string,
  tusiIds?: string[]
): Promise<Assessment> {
  if (assessment.status === "submitted") {
    return assessment;
  }

  const period = await getAssessmentPeriodById(assessment.periodId);
  if (!period || !isPeriodFillable(period)) {
    throw new SelfAssessmentError("Periode sudah tidak bisa dikirim.");
  }

  const answers = await listAssessmentAnswers(assessment.id);
  const selected = await listQuestionsForSelfAssessment({
    tusiIds:
      tusiIds && tusiIds.length > 0
        ? tusiIds
        : assessment.assignment.tusiIds,
    keepQuestionIds: answers.map((item) => item.questionId),
  });
  const answerable = selected.questions.filter(isAnswerableQuestion);
  const answeredIds = new Set(answers.map((item) => item.questionId));
  const missing = answerable.filter((item) => !answeredIds.has(item.id));

  if (missing.length > 0) {
    throw new SelfAssessmentError(
      `Masih ada ${missing.length} soal yang belum dijawab.`
    );
  }

  const now = new Date().toISOString();
  const db = requireDb();
  await updateDoc(doc(db, COLLECTIONS.assessments, assessment.id), {
    status: "submitted",
    submittedAt: now,
    updatedAt: now,
    updatedBy: actorId,
  });

  return {
    ...assessment,
    status: "submitted",
    submittedAt: now,
    updatedAt: now,
    updatedBy: actorId,
  };
}

export function isAnswerableQuestion(question: Question): boolean {
  if (question.type === "likert" || question.type === "yes_no") {
    return true;
  }

  return Boolean(question.options && question.options.length > 0);
}

export function resolveScore(
  question: Question,
  value: string | number
): number | null {
  if (question.type === "likert" && typeof value === "number") {
    return value;
  }

  const option = question.options?.find((item) => item.value === String(value));
  return option?.score ?? null;
}

export type EmployeePeriodCard = {
  period: AssessmentPeriod;
  assessment: Assessment | null;
  fillable: boolean;
};

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new SelfAssessmentError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function mapAssessment(id: string, data: DocumentData): Assessment {
  const assignment = data.assignment && typeof data.assignment === "object"
    ? data.assignment
    : {};

  return {
    id,
    periodId: typeof data.periodId === "string" ? data.periodId : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    assessorId: typeof data.assessorId === "string" ? data.assessorId : "",
    type: data.type === "supervisor" ? "supervisor" : "self",
    status:
      data.status === "submitted" ||
      data.status === "reviewed" ||
      data.status === "completed"
        ? data.status
        : "draft",
    assignment: {
      unitKerjaId:
        typeof assignment.unitKerjaId === "string"
          ? assignment.unitKerjaId
          : null,
      jabatanId:
        typeof assignment.jabatanId === "string" ? assignment.jabatanId : null,
      pangkatId:
        typeof assignment.pangkatId === "string" ? assignment.pangkatId : null,
      tusiIds: Array.isArray(assignment.tusiIds)
        ? assignment.tusiIds.filter(
            (value: unknown): value is string => typeof value === "string"
          )
        : [],
      capturedAt:
        typeof assignment.capturedAt === "string" ? assignment.capturedAt : null,
    },
    overallScore: typeof data.overallScore === "number" ? data.overallScore : null,
    recommendationNote:
      typeof data.recommendationNote === "string"
        ? data.recommendationNote
        : null,
    dimensionScores: mapDimensionScores(data.dimensionScores),
    submittedAt: typeof data.submittedAt === "string" ? data.submittedAt : null,
    reviewedAt: typeof data.reviewedAt === "string" ? data.reviewedAt : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function mapAnswer(id: string, data: DocumentData): AssessmentAnswer {
  return {
    id,
    assessmentId: typeof data.assessmentId === "string" ? data.assessmentId : "",
    questionId: typeof data.questionId === "string" ? data.questionId : "",
    kompetensiId:
      typeof data.kompetensiId === "string" ? data.kompetensiId : null,
    value: parseAnswerValue(data.value),
    score: typeof data.score === "number" ? data.score : null,
    note: typeof data.note === "string" ? data.note : null,
  };
}

function mapDimensionScores(
  value: unknown
): Assessment["dimensionScores"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  return {
    pengetahuan: typeof data.pengetahuan === "number" ? data.pengetahuan : null,
    keterampilan:
      typeof data.keterampilan === "number" ? data.keterampilan : null,
    sikap_perilaku:
      typeof data.sikap_perilaku === "number" ? data.sikap_perilaku : null,
  };
}

function parseAnswerValue(value: unknown): string | number | null {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
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
