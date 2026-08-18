import type { IsoDateString } from "./common";

export type ModePendaftaran = "terbuka" | "tertutup";
export type ModeValidasiTes = "informasi" | "integrasi";

/** Parameter sistem global. Satu dokumen tunggal: system_parameters/global. */
export interface SystemParameters {
  id: "global";
  /** Bobot skor tercapai. bobotAtasan + bobotSelf harus == 1.0. */
  bobotAtasan: number;
  bobotSelf: number;
  /** Gap >= nilai ini berarti kompetensi butuh pelatihan. */
  ambangButuhPelatihan: number;
  /** Skala penilaian tertinggi (mis. 5). */
  skalaMaksimum: number;
  /** Label per level skala, urutan 1..skalaMaksimum. */
  labelSkala: string[];
  /** "terbuka" = siapa pun boleh daftar (jadi pending). "tertutup" = perlu undangan. */
  modePendaftaran: ModePendaftaran;
  /** Domain email yang diizinkan mendaftar. Kosong = semua domain diizinkan. */
  domainDiizinkan: string[];
  namaInstansi: string;
  /** Untuk fitur tes berikutnya (belum dipakai). */
  ambangValidasiTes: number;
  modeValidasiTes: ModeValidasiTes;
  updatedAt: IsoDateString | null;
  updatedBy: string | null;
}
