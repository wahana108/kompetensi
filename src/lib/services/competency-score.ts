import { listKompetensi } from "@/lib/services/kompetensi";
import { listQuestions } from "@/lib/services/question";
import { getSelfAssessment, listAssessmentAnswers } from "@/lib/services/self-assessment";
import { getStandarKompetensi } from "@/lib/services/standar-kompetensi";
import { getSupervisorAssessment } from "@/lib/services/supervisor-assessment";
import type {
  AssessmentAnswer,
  CompetencyScore,
  QuestionType,
  UserProfile,
} from "@/types";

/** Bobot skor tercapai: 70% penilaian atasan, 30% self assessment. */
export const SUPERVISOR_SCORE_WEIGHT = 0.7;
export const SELF_SCORE_WEIGHT = 0.3;

/** Gap >= nilai ini berarti kompetensi butuh pelatihan. */
export const GAP_TRAINING_THRESHOLD = 1.0;

/**
 * Konstanta di atas dipakai sebagai nilai DEFAULT saja. Bobot/ambang yang
 * sebenarnya berasal dari system_parameters/global — dibaca SATU KALI di
 * level halaman/hook pemanggil (mis. tna.ts, use-competency-score.ts) lalu
 * dioper ke sini lewat argumen. File ini sendiri TIDAK membaca Firestore
 * untuk parameter ini.
 */
export type CompetencyScoreWeights = {
  bobotAtasan?: number;
  bobotSelf?: number;
  ambangButuhPelatihan?: number;
};

/**
 * Menghitung skor per kompetensi untuk satu pegawai pada satu periode.
 * Hanya jawaban self assessment dari soal bertipe likert yang dihitung —
 * soal yes_no/pilihan ganda memakai skala berbeda (mis. 0-1 untuk yes_no,
 * bukan skala Level Kompetensi) sehingga dikeluarkan dari rata-rata.
 * Kompetensi yang tidak punya jawaban likert atau tidak terdaftar di
 * standar_kompetensi jabatan pegawai dilewati, bukan diasumsikan.
 */
export async function computeEmployeeCompetencyScores(
  periodId: string,
  employee: UserProfile,
  weights: CompetencyScoreWeights = {}
): Promise<CompetencyScore[]> {
  const supervisorWeight = weights.bobotAtasan ?? SUPERVISOR_SCORE_WEIGHT;
  const selfWeight = weights.bobotSelf ?? SELF_SCORE_WEIGHT;
  const trainingThreshold = weights.ambangButuhPelatihan ?? GAP_TRAINING_THRESHOLD;

  if (!employee.jabatanId) {
    return [];
  }

  const standar = await getStandarKompetensi(employee.jabatanId);
  if (!standar || standar.items.length === 0) {
    return [];
  }

  const requiredLevelByKompetensi = new Map(
    standar.items.map((item) => [item.kompetensiId, item.levelStandar])
  );

  const selfAssessment = await getSelfAssessment(periodId, employee.id);
  const selfAnswers = selfAssessment
    ? await listAssessmentAnswers(selfAssessment.id)
    : [];

  if (selfAnswers.length === 0) {
    return [];
  }

  // Diambil satu kali per pegawai, lalu dipakai sebagai lookup — bukan query per jawaban.
  const questions = await listQuestions();
  const questionTypeById = new Map(
    questions.map((item) => [item.id, item.type])
  );
  const selfScoresByKompetensi = groupLikertScoresByKompetensi(
    selfAnswers,
    questionTypeById
  );

  const supervisorAssessment = employee.supervisorId
    ? await getSupervisorAssessment(periodId, employee.id, employee.supervisorId)
    : null;

  const kompetensiList = await listKompetensi();
  const kompetensiById = new Map(kompetensiList.map((item) => [item.id, item]));

  const results: CompetencyScore[] = [];

  for (const [kompetensiId, likertScores] of selfScoresByKompetensi) {
    const requiredLevel = requiredLevelByKompetensi.get(kompetensiId);
    if (requiredLevel === undefined || likertScores.length === 0) {
      continue;
    }

    const selfScore = average(likertScores);
    const dimensi = kompetensiById.get(kompetensiId)?.dimensi ?? null;
    const supervisorScore =
      dimensi && supervisorAssessment?.dimensionScores
        ? (supervisorAssessment.dimensionScores[dimensi] ?? null)
        : null;

    // Nilai mentah (belum dibulatkan) dipakai untuk keputusan butuhPelatihan.
    // Pembulatan 1 desimal hanya diterapkan ke field yang ditampilkan/disimpan
    // (actualLevel, gap, selfScore) — bukan ke perbandingan ambangnya, supaya
    // gap seperti 0.95 (yang tampil sebagai 1.0 setelah dibulatkan) tetap
    // dievaluasi sebagai "belum butuh pelatihan" sesuai nilai aslinya.
    const rawActualLevel =
      supervisorScore !== null
        ? supervisorScore * supervisorWeight + selfScore * selfWeight
        : selfScore;
    const rawGap = requiredLevel - rawActualLevel;

    results.push({
      kompetensiId,
      selfScore: roundTo2(selfScore),
      supervisorScore,
      requiredLevel,
      actualLevel: roundTo2(rawActualLevel),
      gap: roundTo2(rawGap),
      butuhPelatihan: rawGap >= trainingThreshold,
    });
  }

  return results;
}

function groupLikertScoresByKompetensi(
  answers: AssessmentAnswer[],
  questionTypeById: Map<string, QuestionType>
): Map<string, number[]> {
  const grouped = new Map<string, number[]>();

  for (const answer of answers) {
    if (!answer.kompetensiId) {
      continue;
    }

    if (questionTypeById.get(answer.questionId) !== "likert") {
      continue;
    }

    if (typeof answer.score !== "number") {
      continue;
    }

    const scores = grouped.get(answer.kompetensiId) ?? [];
    scores.push(answer.score);
    grouped.set(answer.kompetensiId, scores);
  }

  return grouped;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// 2 desimal — supaya nilai seperti gap 0.95 (dekat ambang) tidak menyatu
// secara visual dengan 1.00 saat ditampilkan di UI. Murni presisi tampilan;
// butuhPelatihan di atas tetap memakai rawGap yang sama sekali belum dibulatkan.
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}
