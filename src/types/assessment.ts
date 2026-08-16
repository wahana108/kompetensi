import type { Auditable, IsoDateString } from "./common";
import type { KompetensiDimensi } from "./competency";
import type { UserAssignmentSnapshot } from "./user";

export type AssessmentType = "self" | "supervisor";

export type AssessmentStatus =
  | "draft"
  | "submitted"
  | "reviewed"
  | "completed";

export type AssessmentPeriodStatus = "draft" | "active" | "closed";

export interface AssessmentPeriod extends Auditable {
  id: string;
  name: string;
  year: number;
  startsAt: IsoDateString;
  endsAt: IsoDateString;
  status: AssessmentPeriodStatus;
  questionnaireId: string | null;
}

/** Skor ringkas atasan per dimensi. */
export type SupervisorDimensionScores = Record<
  KompetensiDimensi,
  number | null
>;

export interface Assessment extends Auditable {
  id: string;
  periodId: string;
  employeeId: string;
  assessorId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  assignment: UserAssignmentSnapshot;
  overallScore: number | null;
  recommendationNote: string | null;
  dimensionScores: SupervisorDimensionScores | null;
  submittedAt: IsoDateString | null;
  reviewedAt: IsoDateString | null;
}

export interface AssessmentAnswer {
  id: string;
  assessmentId: string;
  questionId: string;
  kompetensiId: string | null;
  value: string | number | null;
  score: number | null;
  note: string | null;
}

export interface CompetencyScore {
  kompetensiId: string;
  selfScore: number | null;
  supervisorScore: number | null;
  requiredLevel: number | null;
  actualLevel: number | null;
  gap: number | null;
}
