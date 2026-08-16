import type { Auditable, IsoDateString, Priority } from "./common";

export interface TnaRecap extends Auditable {
  id: string;
  periodId: string;
  unitKerjaId: string | null;
  kompetensiId: string | null;
  title: string;
  employeeCount: number;
  averageGap: number | null;
  priority: Priority;
  sourceProposalIds: string[];
  notes: string | null;
  generatedAt: IsoDateString | null;
  generatedBy: string | null;
}
