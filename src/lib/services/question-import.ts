import { z } from "zod";
import { getKompetensiDimensiLabel } from "@/lib/services/kompetensi";
import {
  QuestionError,
  normalizeQuestionInput,
  type QuestionWriteInput,
} from "@/lib/services/question";
import type { Kompetensi, Question, QuestionType } from "@/types";

/** Batas soal per satu impor — aman di bawah limit 500 operasi/writeBatch Firestore (soal pilihan_ganda = 2 operasi). */
export const MAX_IMPORT_BATCH_SIZE = 200;

export type ImportTipeSoal = "likert" | "yes_no" | "pilihan_ganda";

export const IMPORT_TYPE_OPTIONS: Array<{
  value: ImportTipeSoal;
  label: string;
}> = [
  { value: "likert", label: "Skala (Likert)" },
  { value: "yes_no", label: "Ya / Tidak" },
  { value: "pilihan_ganda", label: "Pilihan Ganda" },
];

const EXTERNAL_TO_INTERNAL_TYPE: Record<ImportTipeSoal, QuestionType> = {
  likert: "likert",
  yes_no: "yes_no",
  pilihan_ganda: "multiple_choice",
};

function isImportTipeSoal(value: string): value is ImportTipeSoal {
  return value === "likert" || value === "yes_no" || value === "pilihan_ganda";
}

const ImportOpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean(),
});

const ImportSoalRawSchema = z.object({
  kompetensiKode: z.string(),
  pertanyaan: z.string(),
  tipe: z.string(),
  opsi: z.array(ImportOpsiSchema).optional(),
});

const ImportPayloadSchema = z.object({
  schemaVersion: z.string(),
  soal: z.array(ImportSoalRawSchema).min(1, "minimal 1 soal"),
});

export type ImportSoalRaw = z.infer<typeof ImportSoalRawSchema>;
export type ImportPayloadRaw = z.infer<typeof ImportPayloadSchema>;

const FIELD_LABELS: Record<string, string> = {
  schemaVersion: "schemaVersion",
  soal: "soal",
  kompetensiKode: "kompetensiKode",
  pertanyaan: "pertanyaan",
  tipe: "tipe",
  opsi: "opsi",
  teks: "opsi.teks",
  benar: "opsi.benar",
};

function describeZodIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path;

  if (path[0] === "soal" && typeof path[1] === "number") {
    const row = path[1] + 1;
    const field = path.length > 2 ? String(path[path.length - 1]) : null;
    const fieldLabel = field ? (FIELD_LABELS[field] ?? field) : "data soal";
    return `Baris ke-${row}, kolom "${fieldLabel}" (${issue.message}).`;
  }

  const field = path.length > 0 ? String(path[0]) : null;
  const fieldLabel = field ? (FIELD_LABELS[field] ?? field) : null;
  return fieldLabel ? `Kolom "${fieldLabel}" (${issue.message}).` : issue.message;
}

/** Toleran terhadap ```json ... ``` di sekeliling JSON — dibersihkan sebelum di-parse. */
export function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

export type ParsePayloadResult =
  | { ok: true; data: ImportPayloadRaw }
  | { ok: false; error: string };

export function parseImportPayload(raw: string): ParsePayloadResult {
  const cleaned = stripCodeFence(raw);
  if (cleaned.length === 0) {
    return { ok: false, error: "Belum ada JSON yang ditempel." };
  }

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      error:
        "Teks yang ditempel bukan JSON yang valid. Periksa tanda kurung kurawal/siku dan tanda kutip.",
    };
  }

  const parsed = ImportPayloadSchema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues.map(describeZodIssue).join(" ");
    return { ok: false, error: `JSON tidak sesuai skema yang diminta. ${detail}` };
  }

  if (parsed.data.schemaVersion !== "1.0") {
    return {
      ok: false,
      error: `Skema JSON versi "${parsed.data.schemaVersion}" tidak didukung. Versi yang didukung saat ini: "1.0".`,
    };
  }

  if (parsed.data.soal.length > MAX_IMPORT_BATCH_SIZE) {
    return {
      ok: false,
      error: `Terlalu banyak soal dalam satu file (${parsed.data.soal.length}, maksimal ${MAX_IMPORT_BATCH_SIZE}). Pecah jadi beberapa kali impor.`,
    };
  }

  return { ok: true, data: parsed.data };
}

export type ImportRowResult = {
  row: number;
  kompetensiKode: string;
  tipeRaw: string;
  pertanyaan: string;
  opsiCount: number;
  valid: boolean;
  errors: string[];
  writeInput: QuestionWriteInput | null;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Validasi bisnis per baris — dijalankan SETELAH parseImportPayload lolos
 * (bentuk JSON sudah benar). Reuse normalizeQuestionInput() dari
 * question.ts (bukan re-implementasi) untuk aturan teks/dimensi yang sama
 * persis dengan form manual soal.
 */
export function validateImportRows(
  soalList: ImportSoalRaw[],
  context: {
    kompetensiList: Kompetensi[];
    existingQuestions: Question[];
  }
): ImportRowResult[] {
  const existingTexts = new Set(
    context.existingQuestions.map((item) => normalizeText(item.text))
  );
  const seenInBatch = new Map<string, number>();

  return soalList.map((raw, index) => {
    const row = index + 1;
    const errors: string[] = [];

    const kompetensiKode = raw.kompetensiKode.trim();
    const kompetensi = context.kompetensiList.find(
      (item) => item.code && item.code.toUpperCase() === kompetensiKode.toUpperCase()
    );
    if (!kompetensiKode) {
      errors.push('Kolom "kompetensiKode" kosong.');
    } else if (!kompetensi) {
      errors.push(
        `Kode kompetensi "${kompetensiKode}" tidak ditemukan di data Kompetensi.`
      );
    }

    const tipeRaw = raw.tipe.trim();
    const internalType = isImportTipeSoal(tipeRaw)
      ? EXTERNAL_TO_INTERNAL_TYPE[tipeRaw]
      : null;
    if (!internalType) {
      errors.push(
        `Tipe soal "${tipeRaw}" tidak dikenali. Gunakan salah satu: likert, yes_no, pilihan_ganda.`
      );
    }

    const pertanyaan = raw.pertanyaan.trim();
    if (pertanyaan.length === 0) {
      errors.push("Pertanyaan kosong.");
    }

    const opsi = raw.opsi ?? [];
    if (internalType === "multiple_choice") {
      if (opsi.length < 2) {
        errors.push("Soal pilihan ganda butuh minimal 2 opsi jawaban.");
      }
      const benarCount = opsi.filter((item) => item.benar).length;
      if (benarCount === 0) {
        errors.push(
          'Tidak ada opsi yang ditandai sebagai kunci jawaban ("benar": true).'
        );
      } else if (benarCount > 1) {
        errors.push(
          `Ada ${benarCount} opsi yang ditandai benar — harus TEPAT SATU.`
        );
      }
      if (opsi.some((item) => item.teks.trim().length === 0)) {
        errors.push("Ada opsi jawaban dengan teks kosong.");
      }
      const normalizedOpsiTexts = opsi.map((item) => normalizeText(item.teks));
      if (new Set(normalizedOpsiTexts).size !== normalizedOpsiTexts.length) {
        errors.push("Ada opsi jawaban dengan teks yang sama persis.");
      }
    } else if (internalType && opsi.length > 0) {
      errors.push(
        `Soal tipe "${tipeRaw}" tidak boleh punya daftar opsi ("opsi") — hanya pilihan_ganda yang boleh.`
      );
    }

    if (pertanyaan.length > 0) {
      const normalized = normalizeText(pertanyaan);
      const firstSeenRow = seenInBatch.get(normalized);
      if (existingTexts.has(normalized)) {
        errors.push("Pertanyaan ini sudah ada di Bank Soal (duplikat).");
      } else if (firstSeenRow !== undefined) {
        errors.push(
          `Pertanyaan ini duplikat dengan soal baris ke-${firstSeenRow} di file yang sama.`
        );
      } else {
        seenInBatch.set(normalized, row);
      }
    }

    let writeInput: QuestionWriteInput | null = null;
    if (errors.length === 0 && kompetensi && internalType) {
      const correctIndex = opsi.findIndex((item) => item.benar);
      const candidate: QuestionWriteInput = {
        text: pertanyaan,
        code: "",
        type: internalType,
        kompetensiId: kompetensi.id,
        tusiId: null,
        dimensi: kompetensi.dimensi,
        isActive: true,
        multipleChoiceOptions:
          internalType === "multiple_choice"
            ? opsi.map((item, optionIndex) => ({
                value: `opt${optionIndex + 1}`,
                label: item.teks.trim(),
              }))
            : undefined,
        multipleChoiceCorrectValue:
          internalType === "multiple_choice" ? `opt${correctIndex + 1}` : undefined,
      };

      try {
        normalizeQuestionInput(candidate);
        writeInput = candidate;
      } catch (error) {
        errors.push(
          error instanceof QuestionError ? error.message : "Data soal tidak valid."
        );
      }
    }

    return {
      row,
      kompetensiKode,
      tipeRaw,
      pertanyaan,
      opsiCount: opsi.length,
      valid: errors.length === 0,
      errors,
      writeInput,
    };
  });
}

function buildExampleSoal(tipe: ImportTipeSoal): Record<string, unknown> {
  if (tipe === "likert") {
    return {
      kompetensiKode: "K1",
      pertanyaan:
        "Saya dapat menjelaskan perbedaan prosedur akreditasi pelatihan baru dan perpanjangan tanpa membuka pedoman.",
      tipe: "likert",
    };
  }

  if (tipe === "yes_no") {
    return {
      kompetensiKode: "K1",
      pertanyaan:
        "Apakah Anda pernah menangani pengajuan akreditasi yang sempat ditolak, lalu berhasil memperbaikinya hingga disetujui?",
      tipe: "yes_no",
    };
  }

  return {
    kompetensiKode: "K1",
    pertanyaan:
      "Seorang pemohon mengajukan perpanjangan akreditasi dua hari sebelum masa berlaku habis, namun salah satu dokumen pendukung belum lengkap. Langkah pertama yang paling tepat adalah...",
    tipe: "pilihan_ganda",
    opsi: [
      { teks: "Menolak permohonan karena dokumen tidak lengkap", benar: false },
      {
        teks: "Memproses lebih dulu sambil meminta pemohon melengkapi dokumen sebelum masa berlaku habis",
        benar: true,
      },
      { teks: "Memperpanjang otomatis tanpa menunggu dokumen lengkap", benar: false },
      { teks: "Meneruskan ke pimpinan tanpa melakukan pengecekan apa pun", benar: false },
    ],
  };
}

function buildSkemaText(tipe: ImportTipeSoal): string {
  const example: ImportPayloadRaw = {
    schemaVersion: "1.0",
    soal: [buildExampleSoal(tipe) as ImportSoalRaw],
  };

  return [
    'Struktur: { "schemaVersion": "1.0", "soal": [ {...}, {...} ] }',
    'Setiap elemen "soal" wajib punya: "kompetensiKode" (teks), "pertanyaan" (teks), "tipe" ("likert" | "yes_no" | "pilihan_ganda").',
    'Khusus tipe "pilihan_ganda": tambahkan "opsi" (array, minimal 2 elemen), tiap elemen { "teks": "...", "benar": true|false } — TEPAT SATU elemen "benar": true.',
    'Tipe "likert" dan "yes_no": JANGAN sertakan field "opsi" sama sekali.',
    "",
    "Contoh:",
    JSON.stringify(example, null, 2),
  ].join("\n");
}

export function assemblePromptSoal(input: {
  template: string;
  kompetensiList: Kompetensi[];
  tipe: ImportTipeSoal;
  jumlahPerKompetensi: number;
  konteks: string;
}): string {
  const kompetensiText = input.kompetensiList
    .map(
      (item) =>
        `- ${item.code} — ${item.name} (dimensi: ${getKompetensiDimensiLabel(item.dimensi)})`
    )
    .join("\n");
  const tipeOption = IMPORT_TYPE_OPTIONS.find((item) => item.value === input.tipe);
  const tipeText = `${tipeOption?.label ?? input.tipe} (nilai "tipe": "${input.tipe}")`;
  const konteksText = input.konteks.trim() || "(tidak ada catatan konteks tambahan)";

  return input.template
    .replaceAll(
      "{{KOMPETENSI}}",
      kompetensiText || "(belum ada kompetensi dipilih)"
    )
    .replaceAll("{{JUMLAH}}", String(input.jumlahPerKompetensi))
    .replaceAll("{{TIPE}}", tipeText)
    .replaceAll("{{SKEMA}}", buildSkemaText(input.tipe))
    .replaceAll("{{KONTEKS}}", konteksText);
}
