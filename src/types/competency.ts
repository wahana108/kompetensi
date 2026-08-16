import type { Activatable, Auditable } from "./common";

/** Dimensi kompetensi pada form Admin. */
export type KompetensiDimensi =
  | "pengetahuan"
  | "keterampilan"
  | "sikap_perilaku";

/** Kategori tambahan untuk pemakaian nanti (belum diekspos di form). */
export type KompetensiCategory =
  | "teknis"
  | "manajerial"
  | "sosial_kultural"
  | "lainnya";

export interface Kompetensi extends Activatable, Auditable {
  id: string;
  name: string;
  code: string;
  description: string | null;
  dimensi: KompetensiDimensi;
  category: KompetensiCategory;
  /** Level skala yang dipakai. Kosong = semua level aktif. */
  levelIds: string[];
  sortOrder: number;
}

/**
 * Level skala kompetensi.
 * `kompetensiId: null` = skala global yang dipakai antar kompetensi.
 */
export interface KompetensiLevel extends Activatable, Auditable {
  id: string;
  kompetensiId: string | null;
  /** Nilai skor / urutan (1 = terendah). */
  level: number;
  code: string;
  name: string;
  description: string | null;
  minScore: number | null;
  maxScore: number | null;
  sortOrder: number;
}

/** Standar kompetensi yang wajib dimiliki suatu jabatan. Belum dipakai di UI. */
export interface StandarKompetensi extends Activatable, Auditable {
  id: string;
  jabatanId: string;
  kompetensiId: string;
  requiredLevelId: string;
  requiredLevel: number;
}
