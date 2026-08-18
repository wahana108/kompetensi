import type { IsoDateString } from "./common";

/**
 * Kunci jawaban soal pilihan ganda. Dipisah dari collection `questions`
 * (yang boleh dibaca semua orang) supaya tidak bocor ke pegawai yang
 * belum menyelesaikan tes. `periodeId` = periode aktif saat soal terakhir
 * disimpan admin — dipakai firestore.rules untuk mencocokkan dengan
 * test_sessions/{uid}_{periodeId} milik pembaca sebelum mengizinkan baca.
 */
export interface QuestionAnswerKey {
  questionId: string;
  correctValue: string;
  periodeId: string;
  updatedAt: IsoDateString | null;
  updatedBy: string | null;
}

export interface TestSessionAnswer {
  questionId: string;
  kompetensiId: string | null;
  selectedValue: string;
}

export interface TestSessionCompetencyScore {
  kompetensiId: string;
  jumlahBenar: number;
  jumlahSoal: number;
  persenBenar: number;
}

/** Satu-satunya status yang pernah tersimpan — tidak ada draft di Firestore. */
export type TestSessionStatus = "submitted";

/** ID dokumen = `{employeeId}_{periodId}`. Sekali kirim, terkunci selamanya. */
export interface TestSession {
  id: string;
  employeeId: string;
  periodId: string;
  status: TestSessionStatus;
  answers: TestSessionAnswer[];
  /** null sampai fase penilaian (setelah submit) selesai menulis. */
  skorPerKompetensi: TestSessionCompetencyScore[] | null;
  submittedAt: IsoDateString | null;
  createdAt: IsoDateString | null;
  updatedAt: IsoDateString | null;
}
