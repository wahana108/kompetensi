import { doc, getDoc, setDoc, type DocumentData } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { ModePendaftaran, ModeValidasiTes, SystemParameters } from "@/types";

const GLOBAL_DOC_ID = "global";

/** Placeholder wajib ada di templatePromptSoal — lihat perakitan di question-import.ts. */
export const PROMPT_SOAL_PLACEHOLDERS = [
  "{{KOMPETENSI}}",
  "{{JUMLAH}}",
  "{{TIPE}}",
  "{{SKEMA}}",
  "{{KONTEKS}}",
] as const;

/** Nilai default templatePromptSoal — dipakai kalau parameter belum diisi, dan sebagai target "Kembalikan ke Default" di /admin/parameter. */
export const DEFAULT_TEMPLATE_PROMPT_SOAL = `Anda adalah asisten penyusun soal penilaian kompetensi pegawai instansi pemerintah.

TUGAS: Buat soal penilaian untuk kompetensi berikut:
{{KOMPETENSI}}

Tipe soal: {{TIPE}}
Jumlah: {{JUMLAH}} soal per kompetensi di atas.

KONTEKS INSTANSI/UNIT KERJA (perhatikan kalau ada, abaikan kalau kosong):
{{KONTEKS}}

MUTU SOAL — WAJIB DIPATUHI:
1. Soal harus spesifik pada situasi kerja nyata, bukan pernyataan umum yang tidak bisa dinilai.
   BURUK: "Saya mampu menerapkan pengetahuan regulasi."
   BAIK: "Saya dapat menjelaskan perbedaan prosedur akreditasi pelatihan baru dan perpanjangan tanpa membuka pedoman."
2. Variasikan tingkat kesulitan dalam satu kompetensi: sebagian soal tugas rutin sehari-hari, sebagian situasi tidak biasa yang butuh pertimbangan/penalaran, bukan hafalan semata.
3. Untuk pilihan ganda: pengecoh (opsi salah) harus masuk akal — kesalahan yang benar-benar sering terjadi di lapangan, BUKAN opsi yang jelas-jelas salah atau tidak masuk akal. Panjang semua opsi kira-kira setara — jangan sampai jawaban benar adalah opsi paling panjang/detail. Jangan pernah pakai opsi "semua benar" atau "tidak ada yang benar".
4. Untuk likert: satu pernyataan hanya menilai SATU kemampuan — jangan menggabungkan dua hal sekaligus (contoh yang salah: "mampu menyusun DAN mengevaluasi laporan").
5. Hindari kalimat yang jawabannya sudah tersirat jelas di pertanyaannya sendiri.
6. Jangan membuat soal duplikat atau terlalu mirip satu sama lain.

ATURAN FORMAT — WAJIB DIPATUHI:
1. Balas HANYA dengan JSON valid sesuai skema di bawah — tanpa teks pembuka/penutup, tanpa markdown selain JSON itu sendiri.
2. Setiap soal WAJIB memakai "kompetensiKode" persis seperti kode yang tercantum di atas (huruf besar/kecil apa adanya).
3. Pertanyaan ditulis dalam Bahasa Indonesia yang jelas dan baku.
4. Untuk tipe "pilihan_ganda": buat 4 opsi jawaban, dan TEPAT SATU opsi dengan "benar": true — sisanya "benar": false.
5. Untuk tipe "likert" dan "yes_no": JANGAN sertakan field "opsi" sama sekali.

SKEMA JSON YANG DIMINTA:
{{SKEMA}}`;

/** Dipakai kalau dokumen system_parameters/global belum ada. */
export const DEFAULT_SYSTEM_PARAMETERS: SystemParameters = {
  id: "global",
  bobotAtasan: 0.7,
  bobotSelf: 0.3,
  ambangButuhPelatihan: 1.0,
  skalaMaksimum: 5,
  labelSkala: [
    "Sangat Tidak Mampu",
    "Tidak Mampu",
    "Cukup",
    "Mampu",
    "Sangat Mampu",
  ],
  modePendaftaran: "tertutup",
  domainDiizinkan: [],
  namaInstansi: "",
  logoUrl: "",
  ambangValidasiTes: 70,
  modeValidasiTes: "informasi",
  templatePromptSoal: DEFAULT_TEMPLATE_PROMPT_SOAL,
  updatedAt: null,
  updatedBy: null,
};

export class SystemParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemParameterError";
  }
}

export function mapSystemParameterError(error: unknown): string {
  if (error instanceof SystemParameterError) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "permission-denied") {
      return "Hanya Super Admin yang boleh mengubah parameter sistem.";
    }
    if (code === "unavailable") {
      return "Layanan Firestore tidak tersedia. Pastikan emulator berjalan.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan. Coba lagi.";
}

export type SystemParametersWriteInput = {
  bobotAtasan: number;
  bobotSelf: number;
  ambangButuhPelatihan: number;
  skalaMaksimum: number;
  labelSkala: string[];
  modePendaftaran: ModePendaftaran;
  domainDiizinkan: string[];
  namaInstansi: string;
  logoUrl: string;
  ambangValidasiTes: number;
  modeValidasiTes: ModeValidasiTes;
  templatePromptSoal: string;
};

export function normalizeSystemParametersInput(
  input: SystemParametersWriteInput
): SystemParametersWriteInput {
  const bobotAtasan = Number(input.bobotAtasan);
  const bobotSelf = Number(input.bobotSelf);

  if (!Number.isFinite(bobotAtasan) || !Number.isFinite(bobotSelf)) {
    throw new SystemParameterError("Bobot atasan dan bobot self harus angka.");
  }

  if (Math.abs(bobotAtasan + bobotSelf - 1) > 0.001) {
    throw new SystemParameterError(
      `Bobot atasan (${bobotAtasan}) + bobot self (${bobotSelf}) harus berjumlah 1.0.`
    );
  }

  const ambangButuhPelatihan = Number(input.ambangButuhPelatihan);
  if (!Number.isFinite(ambangButuhPelatihan) || ambangButuhPelatihan < 0) {
    throw new SystemParameterError("Ambang butuh pelatihan harus angka >= 0.");
  }

  const skalaMaksimum = Number(input.skalaMaksimum);
  if (!Number.isInteger(skalaMaksimum) || skalaMaksimum < 2) {
    throw new SystemParameterError(
      "Skala maksimum harus bilangan bulat minimal 2."
    );
  }

  const labelSkala = input.labelSkala.map((label) => label.trim());
  if (
    labelSkala.length !== skalaMaksimum ||
    labelSkala.some((label) => label.length === 0)
  ) {
    throw new SystemParameterError(
      `Isi ${skalaMaksimum} label skala, semua tidak boleh kosong.`
    );
  }

  const domainDiizinkan = Array.from(
    new Set(
      input.domainDiizinkan
        .map((domain) => domain.trim().toLowerCase())
        .filter((domain) => domain.length > 0)
    )
  );

  const namaInstansi = input.namaInstansi.trim();
  const logoUrl = input.logoUrl.trim();

  const ambangValidasiTes = Number(input.ambangValidasiTes);
  if (!Number.isFinite(ambangValidasiTes) || ambangValidasiTes < 0) {
    throw new SystemParameterError("Ambang validasi tes harus angka >= 0.");
  }

  if (
    input.modePendaftaran !== "terbuka" &&
    input.modePendaftaran !== "tertutup"
  ) {
    throw new SystemParameterError("Mode pendaftaran tidak valid.");
  }

  if (
    input.modeValidasiTes !== "informasi" &&
    input.modeValidasiTes !== "integrasi"
  ) {
    throw new SystemParameterError("Mode validasi tes tidak valid.");
  }

  const templatePromptSoal = input.templatePromptSoal.trim();
  if (templatePromptSoal.length === 0) {
    throw new SystemParameterError("Template prompt soal tidak boleh kosong.");
  }
  const missingPlaceholders = PROMPT_SOAL_PLACEHOLDERS.filter(
    (placeholder) => !templatePromptSoal.includes(placeholder)
  );
  if (missingPlaceholders.length > 0) {
    throw new SystemParameterError(
      `Template prompt soal harus memuat placeholder: ${missingPlaceholders.join(", ")}.`
    );
  }

  return {
    bobotAtasan,
    bobotSelf,
    ambangButuhPelatihan,
    skalaMaksimum,
    labelSkala,
    modePendaftaran: input.modePendaftaran,
    domainDiizinkan,
    namaInstansi,
    logoUrl,
    ambangValidasiTes,
    modeValidasiTes: input.modeValidasiTes,
    templatePromptSoal,
  };
}

export async function getSystemParameters(): Promise<SystemParameters> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, COLLECTIONS.systemParameters, GLOBAL_DOC_ID));
  if (!snapshot.exists()) {
    return DEFAULT_SYSTEM_PARAMETERS;
  }

  return mapSystemParameters(snapshot.data());
}

export async function saveSystemParameters(
  input: SystemParametersWriteInput,
  actorId: string
): Promise<SystemParameters> {
  const db = requireDb();
  const normalized = normalizeSystemParametersInput(input);
  const now = new Date().toISOString();
  const record: SystemParameters = {
    id: "global",
    ...normalized,
    updatedAt: now,
    updatedBy: actorId,
  };

  await setDoc(doc(db, COLLECTIONS.systemParameters, GLOBAL_DOC_ID), record);
  return record;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new SystemParameterError(
      "Cloud Firestore belum dikonfigurasi. Isi file .env.local."
    );
  }

  return db;
}

function mapSystemParameters(data: DocumentData): SystemParameters {
  const modePendaftaran =
    data.modePendaftaran === "terbuka" || data.modePendaftaran === "tertutup"
      ? data.modePendaftaran
      : DEFAULT_SYSTEM_PARAMETERS.modePendaftaran;
  const modeValidasiTes =
    data.modeValidasiTes === "informasi" || data.modeValidasiTes === "integrasi"
      ? data.modeValidasiTes
      : DEFAULT_SYSTEM_PARAMETERS.modeValidasiTes;

  return {
    id: "global",
    bobotAtasan:
      typeof data.bobotAtasan === "number"
        ? data.bobotAtasan
        : DEFAULT_SYSTEM_PARAMETERS.bobotAtasan,
    bobotSelf:
      typeof data.bobotSelf === "number"
        ? data.bobotSelf
        : DEFAULT_SYSTEM_PARAMETERS.bobotSelf,
    ambangButuhPelatihan:
      typeof data.ambangButuhPelatihan === "number"
        ? data.ambangButuhPelatihan
        : DEFAULT_SYSTEM_PARAMETERS.ambangButuhPelatihan,
    skalaMaksimum:
      typeof data.skalaMaksimum === "number"
        ? data.skalaMaksimum
        : DEFAULT_SYSTEM_PARAMETERS.skalaMaksimum,
    labelSkala: Array.isArray(data.labelSkala)
      ? data.labelSkala.filter((item: unknown): item is string => typeof item === "string")
      : DEFAULT_SYSTEM_PARAMETERS.labelSkala,
    modePendaftaran,
    domainDiizinkan: Array.isArray(data.domainDiizinkan)
      ? data.domainDiizinkan.filter((item: unknown): item is string => typeof item === "string")
      : DEFAULT_SYSTEM_PARAMETERS.domainDiizinkan,
    namaInstansi:
      typeof data.namaInstansi === "string"
        ? data.namaInstansi
        : DEFAULT_SYSTEM_PARAMETERS.namaInstansi,
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : DEFAULT_SYSTEM_PARAMETERS.logoUrl,
    ambangValidasiTes:
      typeof data.ambangValidasiTes === "number"
        ? data.ambangValidasiTes
        : DEFAULT_SYSTEM_PARAMETERS.ambangValidasiTes,
    modeValidasiTes,
    templatePromptSoal:
      typeof data.templatePromptSoal === "string" && data.templatePromptSoal.trim().length > 0
        ? data.templatePromptSoal
        : DEFAULT_SYSTEM_PARAMETERS.templatePromptSoal,
    updatedAt: toIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

function toIso(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}
