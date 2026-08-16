import type { Activatable, Auditable } from "./common";

/** Tugas Pokok dan Fungsi. Dikelola dari Admin Panel. */
export interface Tusi extends Activatable, Auditable {
  id: string;
  name: string;
  /** Kosong jika tidak diisi. */
  code: string;
  description: string | null;
  unitKerjaId: string;
  jabatanId: string | null;
  kompetensiIds: string[];
  sortOrder: number;
}
