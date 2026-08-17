import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { listAssessmentPeriods } from "@/lib/services/assessment-period";
import { listPengguna } from "@/lib/services/pengguna";
import { listUnitKerja } from "@/lib/services/unit-kerja";
import type {
  Assessment,
  AssessmentPeriod,
  TnaRecap,
  TrainingProposal,
  UserProfile,
} from "@/types";

export class TnaServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TnaServiceError";
  }
}

export interface TnaPeriodSummary {
  period: AssessmentPeriod;
  totalPegawai: number;
  selfSubmittedCount: number;
  supervisorSubmittedCount: number;
  proposalCount: number;
  isGenerated: boolean;
  generatedAt: string | null;
}

export interface TnaEmployeeDetail {
  employee: UserProfile;
  selfAssessment: Assessment | null;
  supervisorAssessment: Assessment | null;
}

export function mapTnaError(error: unknown): string {
  if (error instanceof TnaServiceError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Anda tidak memiliki hak akses untuk mengelola Rekap TNA.";
    }
    if (code === "unavailable") {
      return "Layanan Firestore tidak tersedia. Pastikan emulator berjalan.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan pada modul Rekap TNA. Coba lagi.";
}

/**
 * Mendapatkan ringkasan Rekap TNA untuk seluruh periode penilaian.
 */
export async function getTnaPeriodSummaries(): Promise<TnaPeriodSummary[]> {
  const db = requireDb();
  const [periods, users] = await Promise.all([
    listAssessmentPeriods(),
    listPengguna(),
  ]);

  const pegawais = users.filter((user) => user.role === "pegawai");
  const totalPegawai = pegawais.length;

  const summaries: TnaPeriodSummary[] = [];

  for (const period of periods) {
    // Ambil semua assessments untuk periode ini
    const assessmentsSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.assessments),
        where("periodId", "==", period.id)
      )
    );

    const assessments = assessmentsSnapshot.docs.map((docSnap) =>
      mapAssessmentDoc(docSnap.id, docSnap.data())
    );

    const selfSubmitted = assessments.filter(
      (a) => a.type === "self" && a.status === "submitted"
    );
    const supervisorSubmitted = assessments.filter(
      (a) => a.type === "supervisor" && a.status === "submitted"
    );
    const proposalCount = supervisorSubmitted.filter(
      (a) => a.recommendationNote && a.recommendationNote.trim() !== ""
    ).length;

    // Cek apakah TNA sudah digenerate untuk periode ini
    const recapsSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.tnaRecaps),
        where("periodId", "==", period.id)
      )
    );

    const isGenerated = !recapsSnapshot.empty;
    let generatedAt: string | null = null;
    if (isGenerated) {
      const firstRecap = recapsSnapshot.docs[0].data();
      generatedAt = typeof firstRecap.generatedAt === "string" ? firstRecap.generatedAt : null;
    }

    summaries.push({
      period,
      totalPegawai,
      selfSubmittedCount: selfSubmitted.length,
      supervisorSubmittedCount: supervisorSubmitted.length,
      proposalCount,
      isGenerated,
      generatedAt,
    });
  }

  return summaries;
}

/**
 * Mendapatkan detail Rekap TNA pegawai untuk sebuah periode tertentu.
 */
export async function getTnaEmployeeDetails(
  periodId: string
): Promise<TnaEmployeeDetail[]> {
  const db = requireDb();
  const users = await listPengguna();

  // Fetch semua assessments untuk periode ini
  const assessmentsSnapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.assessments),
      where("periodId", "==", periodId)
    )
  );

  const assessments = assessmentsSnapshot.docs.map((docSnap) =>
    mapAssessmentDoc(docSnap.id, docSnap.data())
  );

  const selfByEmployee = new Map<string, Assessment>();
  const supervisorByEmployee = new Map<string, Assessment>();

  for (const a of assessments) {
    if (a.type === "self") {
      selfByEmployee.set(a.employeeId, a);
    } else if (a.type === "supervisor") {
      supervisorByEmployee.set(a.employeeId, a);
    }
  }

  // Pegawai dan pengguna yang memiliki catatan assessment pada periode ini
  const targetUsers = users.filter(
    (user) =>
      user.role === "pegawai" ||
      selfByEmployee.has(user.id) ||
      supervisorByEmployee.has(user.id)
  );

  return targetUsers.map((employee) => ({
    employee,
    selfAssessment: selfByEmployee.get(employee.id) ?? null,
    supervisorAssessment: supervisorByEmployee.get(employee.id) ?? null,
  }));
}

/**
 * Membuat data rekapitulasi TNA secara manual (Generate).
 * Menghasilkan TrainingProposal dan TnaRecap di Firestore.
 */
export async function generateTnaRecap(
  periodId: string,
  actorId: string
): Promise<{ proposalCount: number; recapCount: number }> {
  const db = requireDb();

  // 1. Ambil seluruh data pendukung
  const [users, units] = await Promise.all([
    listPengguna(),
    listUnitKerja(),
  ]);
  const unitMap = new Map(units.map((u) => [u.id, u]));

  // 2. Ambil seluruh assessments untuk periode ini
  const assessmentsSnapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.assessments),
      where("periodId", "==", periodId)
    )
  );
  const assessments = assessmentsSnapshot.docs.map((docSnap) =>
    mapAssessmentDoc(docSnap.id, docSnap.data())
  );

  // Filter supervisor assessments yang sudah disubmit
  const supervisorSubmitted = assessments.filter(
    (a) => a.type === "supervisor" && a.status === "submitted"
  );

  if (supervisorSubmitted.length === 0) {
    throw new TnaServiceError(
      "Belum ada penilaian atasan yang berstatus 'Kirim' (Submitted) pada periode ini. Penilaian atasan diperlukan sebelum melakukan generate Rekap TNA."
    );
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  const proposalsByUnit = new Map<string, TrainingProposal[]>();
  const scoresByUnit = new Map<string, number[]>();
  let proposalCount = 0;

  // 3. Buat TrainingProposal untuk setiap penilaian atasan yang memiliki rekomendasi pelatihan
  for (const assessment of supervisorSubmitted) {
    const note = assessment.recommendationNote?.trim() ?? "";
    const employee = users.find((p) => p.id === assessment.employeeId);
    const unitKerjaId =
      employee?.unitKerjaId ?? assessment.assignment.unitKerjaId ?? "unknown";

    if (assessment.overallScore !== null) {
      if (!scoresByUnit.has(unitKerjaId)) {
        scoresByUnit.set(unitKerjaId, []);
      }
      scoresByUnit.get(unitKerjaId)!.push(assessment.overallScore);
    }

    if (note) {
      const proposalId = `prop_${periodId}_${assessment.employeeId}`;
      const proposal: TrainingProposal = {
        id: proposalId,
        periodId,
        assessmentId: assessment.id,
        employeeId: assessment.employeeId,
        proposedBy: assessment.assessorId,
        kompetensiId: null, // Free text dari atasan
        title: note,
        reason: "Rekomendasi dari Penilaian Atasan",
        priority: "medium",
        status: "proposed",
        createdAt: now,
        updatedAt: now,
        createdBy: actorId,
        updatedBy: actorId,
      };

      const propRef = doc(db, COLLECTIONS.trainingProposals, proposalId);
      batch.set(propRef, proposal);
      proposalCount++;

      if (!proposalsByUnit.has(unitKerjaId)) {
        proposalsByUnit.set(unitKerjaId, []);
      }
      proposalsByUnit.get(unitKerjaId)!.push(proposal);
    }
  }

  // 4. Agregasikan data menjadi TnaRecap per Unit Kerja
  const allUnitIds = Array.from(
    new Set([...proposalsByUnit.keys(), ...scoresByUnit.keys()])
  );
  let recapCount = 0;

  for (const unitId of allUnitIds) {
    const props = proposalsByUnit.get(unitId) ?? [];
    const unitName =
      unitMap.get(unitId)?.name ??
      (unitId === "unknown" ? "Tanpa Unit Kerja" : "Unit Kerja");
    const unitScores = scoresByUnit.get(unitId) ?? [];

    let averageGap: number | null = null;
    if (unitScores.length > 0) {
      const avgScore =
        unitScores.reduce((sum, s) => sum + s, 0) / unitScores.length;
      averageGap = Math.round((5.0 - avgScore) * 10) / 10;
      if (averageGap < 0) averageGap = 0;
    }

    const recapId = `recap_${periodId}_${unitId}`;
    const recap: TnaRecap = {
      id: recapId,
      periodId,
      unitKerjaId: unitId === "unknown" ? null : unitId,
      kompetensiId: null,
      title: `Rekap Usulan Pelatihan - ${unitName}`,
      employeeCount: props.length,
      averageGap,
      priority:
        averageGap && averageGap >= 2.0
          ? "high"
          : averageGap && averageGap >= 1.0
            ? "medium"
            : "low",
      sourceProposalIds: props.map((p) => p.id),
      notes:
        props.length > 0
          ? props.map((p, idx) => `${idx + 1}. ${p.title}`).join("\n")
          : "Tidak ada usulan pelatihan tertulis dari atasan.",
      generatedAt: now,
      generatedBy: actorId,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    };

    const recapRef = doc(db, COLLECTIONS.tnaRecaps, recapId);
    batch.set(recapRef, recap);
    recapCount++;
  }

  // Commit seluruh transaction batch
  await batch.commit();
  return { proposalCount, recapCount };
}


/**
 * Helper untuk inisialisasi Firestore
 */
function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new TnaServiceError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }
  return db;
}

/**
 * Mapping document data dari Firestore ke type Assessment
 */
function mapAssessmentDoc(id: string, data: DocumentData): Assessment {
  const assignment = data.assignment && typeof data.assignment === "object"
    ? data.assignment
    : {};

  return {
    id,
    periodId: typeof data.periodId === "string" ? data.periodId : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    assessorId: typeof data.assessorId === "string" ? data.assessorId : "",
    type: data.type === "supervisor" ? "supervisor" : "self",
    status: data.status === "submitted" ? "submitted" : "draft",
    assignment: {
      unitKerjaId: typeof assignment.unitKerjaId === "string" ? assignment.unitKerjaId : null,
      jabatanId: typeof assignment.jabatanId === "string" ? assignment.jabatanId : null,
      pangkatId: typeof assignment.pangkatId === "string" ? assignment.pangkatId : null,
      tusiIds: Array.isArray(assignment.tusiIds)
        ? assignment.tusiIds.filter((v: unknown): v is string => typeof v === "string")
        : [],
      capturedAt: typeof assignment.capturedAt === "string" ? assignment.capturedAt : null,
    },
    overallScore: typeof data.overallScore === "number" ? data.overallScore : null,
    recommendationNote: typeof data.recommendationNote === "string" ? data.recommendationNote : null,
    dimensionScores: mapDimensionScores(data.dimensionScores),
    submittedAt: typeof data.submittedAt === "string" ? data.submittedAt : null,
    reviewedAt: typeof data.reviewedAt === "string" ? data.reviewedAt : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
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

