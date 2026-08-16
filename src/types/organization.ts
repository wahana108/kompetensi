import type { Activatable, Auditable } from "./common";

/** Unit kerja hierarkis. Root memakai `parentId: null`. */
export interface UnitKerja extends Activatable, Auditable {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  path: string;
  sortOrder: number;
}

export interface Jabatan extends Activatable, Auditable {
  id: string;
  name: string;
  code: string;
  /** Eselon I–V. Null untuk jabatan non-struktural / pelaksana. */
  eselon: string | null;
  description: string | null;
  unitKerjaId: string | null;
  tusiIds: string[];
  sortOrder: number;
}

export interface Pangkat extends Activatable, Auditable {
  id: string;
  name: string;
  golongan: string;
  sortOrder: number;
}
