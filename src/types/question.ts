import type { Activatable, Auditable, IsoDateString } from "./common";
import type { KompetensiDimensi } from "./competency";

export type QuestionType = "likert" | "multiple_choice" | "yes_no" | "open_text";

export interface QuestionOption {
  value: string;
  label: string;
  score: number | null;
}

export interface Question extends Activatable, Auditable {
  id: string;
  code: string;
  text: string;
  type: QuestionType;
  kompetensiId: string | null;
  tusiId: string | null;
  /** Bisa diisi manual atau disalin dari kompetensi. */
  dimensi: KompetensiDimensi | null;
  scaleMin: number | null;
  scaleMax: number | null;
  options: QuestionOption[] | null;
  sortOrder: number;
  /** null = tidak dibuang. Terisi = di Tong Sampah, tersembunyi dari daftar utama & kuesioner. */
  trashedAt: IsoDateString | null;
}

export interface Questionnaire extends Activatable, Auditable {
  id: string;
  name: string;
  description: string | null;
  questionIds: string[];
  periodId: string | null;
}
