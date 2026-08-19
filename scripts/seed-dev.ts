/**
 * Seed data UJI (bukan produksi) untuk Firestore + Auth EMULATOR.
 *
 * Jalankan: npm run seed:dev
 * (emulator harus sudah berjalan lebih dulu: npm run emulators)
 *
 * Script ini HANYA boleh menulis ke emulator. Ia menolak jalan (exit 1) kalau
 * FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST tidak mengarah ke
 * alamat lokal, atau kalau mendeteksi kredensial service account produksi
 * di environment.
 */

import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const DEMO_PROJECT_ID = "demo-tna-kompetensi";
const LOCAL_HOST_PATTERN = /^(127\.0\.0\.1|localhost)(:\d+)?$/;
const SEED_PASSWORD = "password123";

function assertEmulatorTarget(): void {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (!LOCAL_HOST_PATTERN.test(firestoreHost)) {
    console.error(
      `[seed-dev] FIRESTORE_EMULATOR_HOST="${firestoreHost}" bukan alamat lokal (127.0.0.1/localhost). ` +
        "Ini kemungkinan Firestore PRODUKSI. Berhenti demi keamanan."
    );
    process.exit(1);
  }

  if (!LOCAL_HOST_PATTERN.test(authHost)) {
    console.error(
      `[seed-dev] FIREBASE_AUTH_EMULATOR_HOST="${authHost}" bukan alamat lokal (127.0.0.1/localhost). ` +
        "Ini kemungkinan Firebase Auth PRODUKSI. Berhenti demi keamanan."
    );
    process.exit(1);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.error(
      "[seed-dev] Kredensial service account produksi terdeteksi di environment " +
        "(GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_ADMIN_PRIVATE_KEY). " +
        "Hapus dulu variabel itu sebelum menjalankan seed emulator."
    );
    process.exit(1);
  }
}

assertEmulatorTarget();

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
  DEMO_PROJECT_ID;

const app: App = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);

const IDS = {
  unitKerja: "seed-unit-sekretariat",
  jabatan: {
    kasubbag: "seed-jabatan-kasubbag",
    staf: "seed-jabatan-staf",
  },
  kompetensi: {
    k1: "seed-komp-pengetahuan-regulasi",
    k2: "seed-komp-pengetahuan-teknis",
    k3: "seed-komp-keterampilan-analisis",
    k4: "seed-komp-keterampilan-komunikasi",
    k5: "seed-komp-sikap-kerjasama",
    k6: "seed-komp-sikap-integritas",
  },
  soal: {
    k1a: "seed-soal-k1-a",
    k1b: "seed-soal-k1-b",
    k2a: "seed-soal-k2-a",
    k2b: "seed-soal-k2-b",
    k3a: "seed-soal-k3-a",
    k3b: "seed-soal-k3-b",
    k4a: "seed-soal-k4-a",
    k4b: "seed-soal-k4-b",
    k5a: "seed-soal-k5-a",
    k5b: "seed-soal-k5-b",
    k6a: "seed-soal-k6-a",
    k6b: "seed-soal-k6-b",
    yn1: "seed-soal-yn-1",
    yn2: "seed-soal-yn-2",
    mck1a: "seed-soal-mc-k1-a",
    mck1b: "seed-soal-mc-k1-b",
    mck2a: "seed-soal-mc-k2-a",
    mck2b: "seed-soal-mc-k2-b",
    mck3a: "seed-soal-mc-k3-a",
    mck3b: "seed-soal-mc-k3-b",
    mck4a: "seed-soal-mc-k4-a",
    mck4b: "seed-soal-mc-k4-b",
    mck5a: "seed-soal-mc-k5-a",
    mck5b: "seed-soal-mc-k5-b",
    mck6a: "seed-soal-mc-k6-a",
    mck6b: "seed-soal-mc-k6-b",
  },
  periode: "seed-periode-2026",
  user: {
    admin: "seed-admin",
    atasan: "seed-atasan",
    pegawaiA: "seed-pegawai-a",
    pegawaiB: "seed-pegawai-b",
  },
} as const;

const now = new Date().toISOString();

type Dimensi = "pengetahuan" | "keterampilan" | "sikap_perilaku";

const KOMPETENSI_LIST: Array<{
  id: string;
  name: string;
  code: string;
  dimensi: Dimensi;
  sortOrder: number;
}> = [
  { id: IDS.kompetensi.k1, name: "Pengetahuan Regulasi", code: "K1", dimensi: "pengetahuan", sortOrder: 10 },
  { id: IDS.kompetensi.k2, name: "Pengetahuan Teknis", code: "K2", dimensi: "pengetahuan", sortOrder: 20 },
  { id: IDS.kompetensi.k3, name: "Keterampilan Analisis", code: "K3", dimensi: "keterampilan", sortOrder: 30 },
  { id: IDS.kompetensi.k4, name: "Keterampilan Komunikasi", code: "K4", dimensi: "keterampilan", sortOrder: 40 },
  { id: IDS.kompetensi.k5, name: "Sikap Kerja Sama", code: "K5", dimensi: "sikap_perilaku", sortOrder: 50 },
  { id: IDS.kompetensi.k6, name: "Sikap Integritas", code: "K6", dimensi: "sikap_perilaku", sortOrder: 60 },
];

const KOMPETENSI_LEVELS: Array<{
  level: number;
  code: string;
  name: string;
  description: string;
}> = [
  { level: 1, code: "STM", name: "Sangat Tidak Mampu", description: "Belum menunjukkan kompetensi yang diharapkan." },
  { level: 2, code: "TM", name: "Tidak Mampu", description: "Kompetensi masih jauh dari standar." },
  { level: 3, code: "C", name: "Cukup", description: "Kompetensi memenuhi standar minimal." },
  { level: 4, code: "M", name: "Mampu", description: "Kompetensi memenuhi standar dengan baik." },
  { level: 5, code: "SM", name: "Sangat Mampu", description: "Kompetensi melebihi standar yang diharapkan." },
];

// Dua soal likert per kompetensi (id kompetensi -> [soalA, soalB]).
const LIKERT_SOAL_BY_KOMPETENSI: Record<string, [string, string]> = {
  [IDS.kompetensi.k1]: [IDS.soal.k1a, IDS.soal.k1b],
  [IDS.kompetensi.k2]: [IDS.soal.k2a, IDS.soal.k2b],
  [IDS.kompetensi.k3]: [IDS.soal.k3a, IDS.soal.k3b],
  [IDS.kompetensi.k4]: [IDS.soal.k4a, IDS.soal.k4b],
  [IDS.kompetensi.k5]: [IDS.soal.k5a, IDS.soal.k5b],
  [IDS.kompetensi.k6]: [IDS.soal.k6a, IDS.soal.k6b],
};

// Soal yes_no "jebakan" — ditautkan ke kompetensi K1 dan K4 untuk membuktikan
// jawabannya benar-benar dikeluarkan dari perhitungan skorSelf per kompetensi.
const YES_NO_SOAL = [
  { id: IDS.soal.yn1, kompetensiId: IDS.kompetensi.k1 },
  { id: IDS.soal.yn2, kompetensiId: IDS.kompetensi.k4 },
];

// Dua soal pilihan ganda per kompetensi untuk Tes Pengetahuan (id kompetensi -> [soalA, soalB]).
const MC_SOAL_BY_KOMPETENSI: Record<string, [string, string]> = {
  [IDS.kompetensi.k1]: [IDS.soal.mck1a, IDS.soal.mck1b],
  [IDS.kompetensi.k2]: [IDS.soal.mck2a, IDS.soal.mck2b],
  [IDS.kompetensi.k3]: [IDS.soal.mck3a, IDS.soal.mck3b],
  [IDS.kompetensi.k4]: [IDS.soal.mck4a, IDS.soal.mck4b],
  [IDS.kompetensi.k5]: [IDS.soal.mck5a, IDS.soal.mck5b],
  [IDS.kompetensi.k6]: [IDS.soal.mck6a, IDS.soal.mck6b],
};

const MC_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "opt1", label: "Opsi 1" },
  { value: "opt2", label: "Opsi 2" },
  { value: "opt3", label: "Opsi 3" },
  { value: "opt4", label: "Opsi 4" },
];
const MC_CORRECT_VALUE = "opt1";
const MC_WRONG_VALUE = "opt2";

// Sinkron dengan DEFAULT_TEMPLATE_PROMPT_SOAL di src/lib/services/system-parameter.ts —
// diduplikasi di sini karena seed-dev.ts sengaja tidak mengimpor modul client SDK.
const SEED_TEMPLATE_PROMPT_SOAL = `Anda adalah asisten penyusun soal penilaian kompetensi pegawai instansi pemerintah.

TUGAS: Buat soal penilaian untuk kompetensi berikut:
{{KOMPETENSI}}

Tipe soal: {{TIPE}}
Jumlah: {{JUMLAH}} soal per kompetensi di atas.

KONTEKS INSTANSI/UNIT KERJA (perhatikan kalau ada, abaikan kalau kosong):
{{KONTEKS}}

MUTU SOAL — WAJIB DIPATUHI:
1. Soal harus spesifik pada situasi kerja nyata, bukan pernyataan umum yang tidak bisa dinilai.
2. Variasikan tingkat kesulitan dalam satu kompetensi: sebagian soal tugas rutin, sebagian situasi tidak biasa yang butuh pertimbangan.
3. Untuk pilihan ganda: pengecoh harus masuk akal, panjang opsi setara, jangan pakai "semua benar"/"tidak ada yang benar".
4. Untuk likert: satu pernyataan hanya menilai satu kemampuan.
5. Hindari kalimat yang jawabannya sudah tersirat di pertanyaannya sendiri.
6. Jangan membuat soal duplikat atau terlalu mirip satu sama lain.

ATURAN FORMAT — WAJIB DIPATUHI:
1. Balas HANYA dengan JSON valid sesuai skema di bawah — tanpa teks pembuka/penutup.
2. Setiap soal WAJIB memakai "kompetensiKode" persis seperti kode yang tercantum di atas.
3. Untuk tipe "pilihan_ganda": buat 4 opsi jawaban, TEPAT SATU opsi dengan "benar": true.
4. Untuk tipe "likert" dan "yes_no": JANGAN sertakan field "opsi" sama sekali.

SKEMA JSON YANG DIMINTA:
{{SKEMA}}`;

// levelStandar bervariasi (3 dan 4) antar dua jabatan.
const STANDAR_KASUBBAG: Record<string, number> = {
  [IDS.kompetensi.k1]: 3,
  [IDS.kompetensi.k2]: 4,
  [IDS.kompetensi.k3]: 3,
  [IDS.kompetensi.k4]: 4,
  [IDS.kompetensi.k5]: 3,
  [IDS.kompetensi.k6]: 4,
};
const STANDAR_STAF: Record<string, number> = {
  [IDS.kompetensi.k1]: 4,
  [IDS.kompetensi.k2]: 3,
  [IDS.kompetensi.k3]: 4,
  [IDS.kompetensi.k4]: 3,
  [IDS.kompetensi.k5]: 4,
  [IDS.kompetensi.k6]: 3,
};

// Pegawai A (skor tinggi, jabatan Kasubbag, standar 3/4 di atas) — dirancang
// supaya skorTercapai >= levelStandar hampir di semua kompetensi -> gap <= 0.
const PEGAWAI_A_LIKERT: Record<string, [number, number]> = {
  [IDS.kompetensi.k1]: [5, 5],
  [IDS.kompetensi.k2]: [5, 4],
  [IDS.kompetensi.k3]: [5, 5],
  [IDS.kompetensi.k4]: [4, 4],
  [IDS.kompetensi.k5]: [5, 4],
  [IDS.kompetensi.k6]: [5, 5],
};
const PEGAWAI_A_DIMENSI: Record<Dimensi, number> = {
  pengetahuan: 5,
  keterampilan: 4,
  sikap_perilaku: 5,
};

// Pegawai B (skor rendah, jabatan Staf, standar 3/4 di atas). dimensionScores
// SENGAJA dibuat berbeda per dimensi (2/1/3) — kalau nilai sama di ketiganya
// (mis. 2/2/2), bug pemetaan dimensi->kompetensi tidak akan ketahuan dari
// hasil akhir. Beberapa kompetensi juga sengaja dibuat pas di sekitar ambang
// GAP_TRAINING_THRESHOLD (1.0) untuk menguji perilaku batas:
//  - K4: gap mentah 0.95 (< 1.0, jadi butuhPelatihan HARUS false) tapi
//    setelah dibulatkan 1 desimal tampil sebagai 1.0 — kasus paling kritis,
//    membuktikan perbandingan ambang tidak boleh memakai nilai yang sudah
//    dibulatkan.
//  - K5: gap mentah tepat 1.0 (>=, jadi butuhPelatihan HARUS true) — menguji
//    ambang inklusif.
//  - K1: gap mentah 1.1 (> 1.0, jelas true) sebagai pembanding sisi atas.
//    (1.05 persis tidak bisa dicapai: self assessment adalah rata-rata 2
//    jawaban likert bulat 1-5 dan skor atasan bulat, sehingga langkah
//    terkecil yang bisa dicapai adalah 0.15.)
const PEGAWAI_B_LIKERT: Record<string, [number, number]> = {
  [IDS.kompetensi.k1]: [5, 5],
  [IDS.kompetensi.k2]: [2, 3],
  [IDS.kompetensi.k3]: [4, 4],
  [IDS.kompetensi.k4]: [4, 5],
  [IDS.kompetensi.k5]: [3, 3],
  [IDS.kompetensi.k6]: [2, 2],
};
const PEGAWAI_B_DIMENSI: Record<Dimensi, number> = {
  pengetahuan: 2,
  keterampilan: 1,
  sikap_perilaku: 3,
};

async function ensureAuthUser(input: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<void> {
  const payload = {
    email: input.email,
    password: SEED_PASSWORD,
    displayName: input.displayName,
    emailVerified: true,
  };

  try {
    await auth.getUser(input.uid);
    await auth.updateUser(input.uid, payload);
  } catch (error) {
    if (isUserNotFound(error)) {
      await auth.createUser({ uid: input.uid, ...payload });
      return;
    }
    throw error;
  }
}

function isUserNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "auth/user-not-found"
  );
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

async function main() {
  console.log(`[seed-dev] Menulis ke Firestore emulator (${process.env.FIRESTORE_EMULATOR_HOST}), project "${projectId}"...`);

  await Promise.all([
    ensureAuthUser({ uid: IDS.user.admin, email: "admin@seed.test", displayName: "Admin Seed" }),
    ensureAuthUser({ uid: IDS.user.atasan, email: "atasan@seed.test", displayName: "Atasan Seed" }),
    ensureAuthUser({ uid: IDS.user.pegawaiA, email: "pegawai-a@seed.test", displayName: "Pegawai A (skor tinggi)" }),
    ensureAuthUser({ uid: IDS.user.pegawaiB, email: "pegawai-b@seed.test", displayName: "Pegawai B (skor rendah)" }),
  ]);

  const batch = db.batch();
  let writeCount = 0;
  function set(collection: string, id: string, data: Record<string, unknown>) {
    batch.set(db.collection(collection).doc(id), data);
    writeCount++;
  }

  // --- Unit kerja & jabatan ---
  set("unit_kerja", IDS.unitKerja, {
    id: IDS.unitKerja,
    name: "Sekretariat",
    code: "SEK",
    parentId: null,
    level: 1,
    path: `/${IDS.unitKerja}`,
    sortOrder: 10,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  set("jabatan", IDS.jabatan.kasubbag, {
    id: IDS.jabatan.kasubbag,
    name: "Kepala Sub Bagian",
    code: "KASUBBAG",
    eselon: "IV",
    description: null,
    unitKerjaId: IDS.unitKerja,
    tusiIds: [],
    sortOrder: 10,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  set("jabatan", IDS.jabatan.staf, {
    id: IDS.jabatan.staf,
    name: "Staf Pelaksana",
    code: "STAF",
    eselon: null,
    description: null,
    unitKerjaId: IDS.unitKerja,
    tusiIds: [],
    sortOrder: 20,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  // --- Kompetensi & level kompetensi (skala global 1-5) ---
  for (const item of KOMPETENSI_LIST) {
    set("kompetensi", item.id, {
      id: item.id,
      name: item.name,
      code: item.code,
      description: null,
      dimensi: item.dimensi,
      category: "lainnya",
      levelIds: [],
      sortOrder: item.sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: IDS.user.admin,
      updatedBy: IDS.user.admin,
    });
  }

  for (const level of KOMPETENSI_LEVELS) {
    set("kompetensi_levels", `seed-level-${level.level}`, {
      id: `seed-level-${level.level}`,
      kompetensiId: null,
      level: level.level,
      code: level.code,
      name: level.name,
      description: level.description,
      minScore: null,
      maxScore: null,
      sortOrder: level.level,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: IDS.user.admin,
      updatedBy: IDS.user.admin,
    });
  }

  // --- Standar kompetensi (levelStandar 3 & 4, beda per jabatan) ---
  set("standar_kompetensi", IDS.jabatan.kasubbag, {
    id: IDS.jabatan.kasubbag,
    jabatanId: IDS.jabatan.kasubbag,
    items: KOMPETENSI_LIST.map((item) => ({
      kompetensiId: item.id,
      levelStandar: STANDAR_KASUBBAG[item.id],
    })),
    updatedAt: now,
    updatedBy: IDS.user.admin,
  });

  set("standar_kompetensi", IDS.jabatan.staf, {
    id: IDS.jabatan.staf,
    jabatanId: IDS.jabatan.staf,
    items: KOMPETENSI_LIST.map((item) => ({
      kompetensiId: item.id,
      levelStandar: STANDAR_STAF[item.id],
    })),
    updatedAt: now,
    updatedBy: IDS.user.admin,
  });

  // --- Bank soal: 12 likert (2 per kompetensi) + 2 yes_no jebakan ---
  let sortOrder = 10;
  for (const item of KOMPETENSI_LIST) {
    const [soalA, soalB] = LIKERT_SOAL_BY_KOMPETENSI[item.id];
    for (const soalId of [soalA, soalB]) {
      set("questions", soalId, {
        id: soalId,
        code: soalId.toUpperCase(),
        text: `[${item.name}] Saya mampu menerapkan ${item.name.toLowerCase()} dalam pekerjaan sehari-hari.`,
        type: "likert",
        kompetensiId: item.id,
        tusiId: null,
        dimensi: item.dimensi,
        scaleMin: 1,
        scaleMax: 5,
        options: null,
        sortOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: IDS.user.admin,
        updatedBy: IDS.user.admin,
      });
      sortOrder += 10;
    }
  }

  for (const item of YES_NO_SOAL) {
    const kompetensi = KOMPETENSI_LIST.find((k) => k.id === item.kompetensiId)!;
    set("questions", item.id, {
      id: item.id,
      code: item.id.toUpperCase(),
      text: `[${kompetensi.name}] Apakah Anda pernah mengikuti pelatihan terkait ${kompetensi.name.toLowerCase()}?`,
      type: "yes_no",
      kompetensiId: item.kompetensiId,
      tusiId: null,
      dimensi: kompetensi.dimensi,
      scaleMin: null,
      scaleMax: null,
      options: [
        { value: "ya", label: "Ya", score: 1 },
        { value: "tidak", label: "Tidak", score: 0 },
      ],
      sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: IDS.user.admin,
      updatedBy: IDS.user.admin,
    });
    sortOrder += 10;
  }

  // --- Bank soal: 12 multiple_choice (2 per kompetensi) untuk Tes Pengetahuan,
  // ditambah kunci jawaban terpisah di question_answer_keys (lihat firestore.rules
  // untuk kapan kunci ini boleh dibaca pegawai). ---
  for (const item of KOMPETENSI_LIST) {
    const [mcA, mcB] = MC_SOAL_BY_KOMPETENSI[item.id];
    for (const soalId of [mcA, mcB]) {
      set("questions", soalId, {
        id: soalId,
        code: soalId.toUpperCase(),
        text: `[${item.name}] Soal pengetahuan terkait ${item.name.toLowerCase()}.`,
        type: "multiple_choice",
        kompetensiId: item.id,
        tusiId: null,
        dimensi: item.dimensi,
        scaleMin: null,
        scaleMax: null,
        options: MC_OPTIONS.map((opt) => ({ ...opt, score: null })),
        sortOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: IDS.user.admin,
        updatedBy: IDS.user.admin,
      });
      sortOrder += 10;

      set("question_answer_keys", soalId, {
        questionId: soalId,
        correctValue: MC_CORRECT_VALUE,
        periodeId: IDS.periode,
        updatedAt: now,
        updatedBy: IDS.user.admin,
      });
    }
  }

  // --- Periode penilaian aktif ---
  set("assessment_periods", IDS.periode, {
    id: IDS.periode,
    name: "Periode Uji Coba 2026",
    year: 2026,
    startsAt: "2026-01-01",
    endsAt: "2026-12-31",
    status: "active",
    questionnaireId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  // --- Parameter sistem (nilai default) ---
  set("system_parameters", "global", {
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
    namaInstansi: "Instansi Uji Coba",
    logoUrl: "",
    ambangValidasiTes: 70,
    modeValidasiTes: "informasi",
    templatePromptSoal: SEED_TEMPLATE_PROMPT_SOAL,
    updatedAt: now,
    updatedBy: IDS.user.admin,
  });

  // --- Pengguna ---
  set("users", IDS.user.admin, {
    id: IDS.user.admin,
    email: "admin@seed.test",
    displayName: "Admin Seed",
    photoURL: null,
    nip: null,
    role: "super_admin",
    status: "aktif",
    supervisorId: null,
    unitKerjaId: IDS.unitKerja,
    jabatanId: null,
    pangkatId: null,
    tusiIds: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  set("users", IDS.user.atasan, {
    id: IDS.user.atasan,
    email: "atasan@seed.test",
    displayName: "Atasan Seed",
    photoURL: null,
    nip: null,
    role: "pegawai",
    status: "aktif",
    supervisorId: null,
    unitKerjaId: IDS.unitKerja,
    jabatanId: IDS.jabatan.kasubbag,
    pangkatId: null,
    tusiIds: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  set("users", IDS.user.pegawaiA, {
    id: IDS.user.pegawaiA,
    email: "pegawai-a@seed.test",
    displayName: "Pegawai A (skor tinggi)",
    photoURL: null,
    nip: null,
    role: "pegawai",
    status: "aktif",
    supervisorId: IDS.user.atasan,
    unitKerjaId: IDS.unitKerja,
    jabatanId: IDS.jabatan.kasubbag,
    pangkatId: null,
    tusiIds: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  set("users", IDS.user.pegawaiB, {
    id: IDS.user.pegawaiB,
    email: "pegawai-b@seed.test",
    displayName: "Pegawai B (skor rendah)",
    photoURL: null,
    nip: null,
    role: "pegawai",
    status: "aktif",
    supervisorId: IDS.user.atasan,
    unitKerjaId: IDS.unitKerja,
    jabatanId: IDS.jabatan.staf,
    pangkatId: null,
    tusiIds: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.admin,
    updatedBy: IDS.user.admin,
  });

  // --- Self assessment (submitted) + assessment_answers untuk pegawai A & B ---
  seedSelfAssessment({
    set,
    employeeId: IDS.user.pegawaiA,
    jabatanId: IDS.jabatan.kasubbag,
    likertAnswers: PEGAWAI_A_LIKERT,
    yesNoAnswers: { [IDS.soal.yn1]: "tidak", [IDS.soal.yn2]: "tidak" },
  });
  seedSelfAssessment({
    set,
    employeeId: IDS.user.pegawaiB,
    jabatanId: IDS.jabatan.staf,
    likertAnswers: PEGAWAI_B_LIKERT,
    yesNoAnswers: { [IDS.soal.yn1]: "ya", [IDS.soal.yn2]: "tidak" },
  });

  // --- Penilaian atasan (submitted) untuk pegawai A & B ---
  seedSupervisorAssessment({
    set,
    employeeId: IDS.user.pegawaiA,
    jabatanId: IDS.jabatan.kasubbag,
    dimensionScores: PEGAWAI_A_DIMENSI,
    recommendationNote: null,
  });
  seedSupervisorAssessment({
    set,
    employeeId: IDS.user.pegawaiB,
    jabatanId: IDS.jabatan.staf,
    dimensionScores: PEGAWAI_B_DIMENSI,
    recommendationNote:
      "Perlu pelatihan penguatan pengetahuan regulasi dan keterampilan analisis.",
  });

  // --- Tes Pengetahuan (submitted) untuk Pegawai B ---
  // Sengaja dirancang: K6 punya gap PALING RENDAH (0.30, butuhPelatihan=false)
  // di antara 6 kompetensi Pegawai B, tapi di sini dibuat GAGAL tes
  // pengetahuan (0%, di bawah ambangValidasiTes default 70). Ini sinyal
  // paling berguna untuk atasan: gap kecil dari self+atasan assessment tidak
  // berarti pengetahuan dasarnya benar-benar sudah memadai. Kompetensi
  // lainnya dibuat lulus (100%) supaya kontras K6 terlihat jelas di kolom
  // Validasi Tes.
  seedKnowledgeTestSession({
    set,
    employeeId: IDS.user.pegawaiB,
    wrongKompetensiIds: [IDS.kompetensi.k6],
  });

  await batch.commit();
  console.log(`[seed-dev] Selesai. ${writeCount} dokumen Firestore ditulis, 4 akun Auth emulator disiapkan.`);
  console.log(`[seed-dev] Login: admin@seed.test / atasan@seed.test / pegawai-a@seed.test / pegawai-b@seed.test — password: ${SEED_PASSWORD}`);
}

function seedSelfAssessment(input: {
  set: (collection: string, id: string, data: Record<string, unknown>) => void;
  employeeId: string;
  jabatanId: string;
  likertAnswers: Record<string, [number, number]>;
  yesNoAnswers: Record<string, "ya" | "tidak">;
}) {
  const assessmentId = `self_${IDS.periode}_${input.employeeId}`;

  input.set("assessments", assessmentId, {
    id: assessmentId,
    periodId: IDS.periode,
    employeeId: input.employeeId,
    assessorId: input.employeeId,
    type: "self",
    status: "submitted",
    assignment: {
      unitKerjaId: IDS.unitKerja,
      jabatanId: input.jabatanId,
      pangkatId: null,
      tusiIds: [],
      capturedAt: now,
    },
    overallScore: null,
    recommendationNote: null,
    dimensionScores: null,
    submittedAt: now,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: input.employeeId,
    updatedBy: input.employeeId,
  });

  for (const item of KOMPETENSI_LIST) {
    const [soalA, soalB] = LIKERT_SOAL_BY_KOMPETENSI[item.id];
    const [scoreA, scoreB] = input.likertAnswers[item.id];

    for (const [soalId, score] of [
      [soalA, scoreA],
      [soalB, scoreB],
    ] as const) {
      const answerId = `${assessmentId}_${soalId}`;
      input.set("assessment_answers", answerId, {
        id: answerId,
        assessmentId,
        questionId: soalId,
        kompetensiId: item.id,
        value: score,
        score,
        note: null,
      });
    }
  }

  for (const item of YES_NO_SOAL) {
    const value = input.yesNoAnswers[item.id];
    const score = value === "ya" ? 1 : 0;
    const answerId = `${assessmentId}_${item.id}`;
    input.set("assessment_answers", answerId, {
      id: answerId,
      assessmentId,
      questionId: item.id,
      kompetensiId: item.kompetensiId,
      value,
      score,
      note: null,
    });
  }
}

function seedSupervisorAssessment(input: {
  set: (collection: string, id: string, data: Record<string, unknown>) => void;
  employeeId: string;
  jabatanId: string;
  dimensionScores: Record<Dimensi, number>;
  recommendationNote: string | null;
}) {
  const assessmentId = `sup_${IDS.periode}_${input.employeeId}_${IDS.user.atasan}`;
  const overallScore = roundTo1(
    average([
      input.dimensionScores.pengetahuan,
      input.dimensionScores.keterampilan,
      input.dimensionScores.sikap_perilaku,
    ])
  );

  input.set("assessments", assessmentId, {
    id: assessmentId,
    periodId: IDS.periode,
    employeeId: input.employeeId,
    assessorId: IDS.user.atasan,
    type: "supervisor",
    status: "submitted",
    assignment: {
      unitKerjaId: IDS.unitKerja,
      jabatanId: input.jabatanId,
      pangkatId: null,
      tusiIds: [],
      capturedAt: now,
    },
    overallScore,
    recommendationNote: input.recommendationNote,
    dimensionScores: input.dimensionScores,
    submittedAt: now,
    reviewedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: IDS.user.atasan,
    updatedBy: IDS.user.atasan,
  });
}

function seedKnowledgeTestSession(input: {
  set: (collection: string, id: string, data: Record<string, unknown>) => void;
  employeeId: string;
  wrongKompetensiIds: string[];
}) {
  const sessionId = `${input.employeeId}_${IDS.periode}`;
  const answers: Array<{
    questionId: string;
    kompetensiId: string;
    selectedValue: string;
  }> = [];
  const skorPerKompetensi: Array<{
    kompetensiId: string;
    jumlahBenar: number;
    jumlahSoal: number;
    persenBenar: number;
  }> = [];

  for (const item of KOMPETENSI_LIST) {
    const [mcA, mcB] = MC_SOAL_BY_KOMPETENSI[item.id];
    const isWrong = input.wrongKompetensiIds.includes(item.id);
    const selectedValue = isWrong ? MC_WRONG_VALUE : MC_CORRECT_VALUE;

    for (const soalId of [mcA, mcB]) {
      answers.push({ questionId: soalId, kompetensiId: item.id, selectedValue });
    }

    skorPerKompetensi.push({
      kompetensiId: item.id,
      jumlahBenar: isWrong ? 0 : 2,
      jumlahSoal: 2,
      persenBenar: isWrong ? 0 : 100,
    });
  }

  input.set("test_sessions", sessionId, {
    id: sessionId,
    employeeId: input.employeeId,
    periodId: IDS.periode,
    status: "submitted",
    answers,
    skorPerKompetensi,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

main().catch((error) => {
  console.error("[seed-dev] Gagal:", error);
  process.exit(1);
});
