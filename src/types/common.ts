/**
 * Tipe bersama. Tanggal disimpan sebagai ISO 8601 di layer aplikasi.
 * Saat menulis ke Firestore, konversi ke Timestamp jika diperlukan.
 */

export type IsoDateString = string;

export type Priority = "low" | "medium" | "high";

export interface Auditable {
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface Activatable {
  isActive: boolean;
}
