import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  getActiveAssessmentPeriod,
  getAssessmentPeriodById,
} from "@/lib/services/assessment-period";
import { KOMPETENSI_DIMENSI_OPTIONS } from "@/lib/services/kompetensi";
import { listSubordinates } from "@/lib/services/pengguna";
import { getSelfAssessment } from "@/lib/services/self-assessment";
import type {
  Assessment,
  AssessmentPeriod,
  KompetensiDimensi,
  SupervisorDimensionScores,
  UserProfile,
} from "@/types";

export class SupervisorAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupervisorAssessmentError";
  }
}

export const SUPERVISOR_DIMENSIONS: KompetensiDimensi[] =
  KOMPETENSI_DIMENSI_OPTIONS.map((item) => item.value);

export function supervisorAssessmentId(
  periodId: string,
  employeeId: string,
  supervisorId: string
): string {
  return `sup_${periodId}_${employeeId}_${supervisorId}`;
}

export function emptyDimensionScores(): SupervisorDimensionScores {
  return {
    pengetahuan: null,
    keterampilan: null,
    sikap_perilaku: null,
  };
}

export function mapSupervisorAssessmentError(error: unknown): string {
  if (error instanceof SupervisorAssessmentError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak berhak mengubah penilaian atasan ini.";
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

export type SupervisorReviewCard = {
  employee: UserProfile;
  selfAssessment: Assessment;
  supervisorAssessment: Assessment | null;
  reviewed: boolean;
};

export async function listSupervisorReviewCards(
  supervisorId: string
): Promise<{
  period: AssessmentPeriod | null;
  cards: SupervisorReviewCard[];
}> {
  const [period, subordinates] = await Promise.all([
    getActiveAssessmentPeriod(),
    listSubordinates(supervisorId),
  ]);

  if (!period || subordinates.length === 0) {
    return { period, cards: [] };
  }

  const cards: SupervisorReviewCard[] = [];

  for (const employee of subordinates) {
    const [selfAssessment, supervisorAssessment] = await Promise.all([
      getSelfAssessment(period.id, employee.id),
      getSupervisorAssessment(period.id, employee.id, supervisorId),
    ]);

    if (!selfAssessment) {
      continue;
    }

    cards.push({
      employee,
      selfAssessment,
      supervisorAssessment,
      reviewed: supervisorAssessment?.status === "submitted",
    });
  }

  return { period, cards };
}

export async function getSupervisorAssessment(
  periodId: string,
  employeeId: string,
  supervisorId: string
): Promise<Assessment | null> {
  const db = requireDb();
  try {
    const snapshot = await getDoc(
      doc(
        db,
        COLLECTIONS.assessments,
        supervisorAssessmentId(periodId, employeeId, supervisorId)
      )
    );

    if (!snapshot.exists()) {
      return null;
    }

    return mapSupervisorDoc(snapshot.id, snapshot.data());
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

export async function saveSupervisorAssessment(input: {
  periodId: string;
  employee: UserProfile;
  supervisor: UserProfile;
  scores: SupervisorDimensionScores;
  recommendationNote: string;
  submit: boolean;
}): Promise<Assessment> {
  const period = await getAssessmentPeriodById(input.periodId);
  if (!period || period.status !== "active") {
    throw new SupervisorAssessmentError(
      "Periode aktif tidak ditemukan. Penilaian atasan hanya bisa diisi pada periode aktif."
    );
  }

  if (input.employee.supervisorId !== input.supervisor.id) {
    throw new SupervisorAssessmentError(
      "Anda bukan atasan pegawai ini."
    );
  }

  if (input.submit && !hasCompleteScores(input.scores)) {
    throw new SupervisorAssessmentError(
      "Isi penilaian untuk ketiga dimensi sebelum mengirim."
    );
  }

  const existing = await getSupervisorAssessment(
    period.id,
    input.employee.id,
    input.supervisor.id
  );

  if (existing?.status === "submitted") {
    throw new SupervisorAssessmentError(
      "Penilaian atasan sudah dikirim dan tidak bisa diubah."
    );
  }

  const now = new Date().toISOString();
  const id = supervisorAssessmentId(
    period.id,
    input.employee.id,
    input.supervisor.id
  );
  const overallScore = averageScore(input.scores);
  const record: Assessment = {
    id,
    periodId: period.id,
    employeeId: input.employee.id,
    assessorId: input.supervisor.id,
    type: "supervisor",
    status: input.submit ? "submitted" : "draft",
    assignment: existing?.assignment ?? {
      unitKerjaId: input.employee.unitKerjaId,
      jabatanId: input.employee.jabatanId,
      pangkatId: input.employee.pangkatId,
      tusiIds: input.employee.tusiIds,
      capturedAt: now,
    },
    overallScore,
    recommendationNote: input.recommendationNote.trim() || null,
    dimensionScores: input.scores,
    submittedAt: input.submit ? now : null,
    reviewedAt: input.submit ? now : null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? input.supervisor.id,
    updatedBy: input.supervisor.id,
  };

  const db = requireDb();
  const ref = doc(db, COLLECTIONS.assessments, id);
  if (existing) {
    await updateDoc(ref, {
      dimensionScores: record.dimensionScores,
      recommendationNote: record.recommendationNote,
      overallScore: record.overallScore,
      status: record.status,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt,
      updatedAt: now,
      updatedBy: input.supervisor.id,
    });
  } else {
    await setDoc(ref, record);
  }

  return record;
}

export function hasCompleteScores(scores: SupervisorDimensionScores): boolean {
  return SUPERVISOR_DIMENSIONS.every((key) => typeof scores[key] === "number");
}

function averageScore(scores: SupervisorDimensionScores): number | null {
  const values = SUPERVISOR_DIMENSIONS.map((key) => scores[key]).filter(
    (value): value is number => typeof value === "number"
  );

  if (values.length === 0) {
    return null;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function mapSupervisorDoc(
  id: string,
  data: Record<string, unknown>
): Assessment {
  const assignment =
    data.assignment && typeof data.assignment === "object"
      ? (data.assignment as Record<string, unknown>)
      : {};
  const rawScores =
    data.dimensionScores && typeof data.dimensionScores === "object"
      ? (data.dimensionScores as Record<string, unknown>)
      : {};

  return {
    id,
    periodId: typeof data.periodId === "string" ? data.periodId : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    assessorId: typeof data.assessorId === "string" ? data.assessorId : "",
    type: "supervisor",
    status: data.status === "submitted" ? "submitted" : "draft",
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
            (value): value is string => typeof value === "string"
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
    dimensionScores: {
      pengetahuan:
        typeof rawScores.pengetahuan === "number" ? rawScores.pengetahuan : null,
      keterampilan:
        typeof rawScores.keterampilan === "number"
          ? rawScores.keterampilan
          : null,
      sikap_perilaku:
        typeof rawScores.sikap_perilaku === "number"
          ? rawScores.sikap_perilaku
          : null,
    },
    submittedAt: typeof data.submittedAt === "string" ? data.submittedAt : null,
    reviewedAt: typeof data.reviewedAt === "string" ? data.reviewedAt : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new SupervisorAssessmentError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}
