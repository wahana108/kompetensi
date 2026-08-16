import type { Auditable, Priority } from "./common";

export type TrainingProposalStatus =
  | "draft"
  | "proposed"
  | "approved"
  | "rejected";

export interface TrainingProposal extends Auditable {
  id: string;
  periodId: string;
  assessmentId: string | null;
  employeeId: string;
  proposedBy: string;
  kompetensiId: string | null;
  title: string;
  reason: string | null;
  priority: Priority;
  status: TrainingProposalStatus;
}
