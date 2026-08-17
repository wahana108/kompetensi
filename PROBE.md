# PROBE.md

## 1. Soal Self Assessment

Sumber: collection Firestore `questions` (`src/lib/firebase/collections.ts:10` → `questions: "questions"`), diambil lewat `listQuestions()` di `src/lib/services/question.ts:162-168`, dipakai oleh `listActiveQuestions()` / `listQuestionsForSelfAssessment()` di `src/lib/services/self-assessment.ts:81-101`, dipanggil dari `src/app/(dashboard)/dashboard/penilaian/[periodeId]/page.tsx:88`.

Type soal, `src/types/question.ts:12-25`:
```ts
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
}
```

Jawaban tegas: soal punya **kedua-duanya** — `kompetensiId` (baris 17) DAN `tusiId` (baris 18). Tidak ada field unit kerja langsung di `Question`.

## 2. Penyimpanan Jawaban

**Self assessment** — collection `assessments` (`src/types/assessment.ts:31-44`):
```ts
export interface Assessment extends Auditable {
  id: string;
  periodId: string;
  employeeId: string;
  assessorId: string;
  type: AssessmentType;               // "self" | "supervisor"
  status: AssessmentStatus;           // draft|submitted|reviewed|completed
  assignment: UserAssignmentSnapshot;
  overallScore: number | null;
  recommendationNote: string | null;
  dimensionScores: SupervisorDimensionScores | null;
  submittedAt: IsoDateString | null;
  reviewedAt: IsoDateString | null;
}
```
Jawaban per soal — collection `assessment_answers` (`src/types/assessment.ts:46-54`):
```ts
export interface AssessmentAnswer {
  id: string;
  assessmentId: string;
  questionId: string;
  kompetensiId: string | null;
  value: string | number | null;
  score: number | null;
  note: string | null;
}
```
**Penilaian atasan** memakai collection **yang sama** `assessments`, dokumen dengan `type: "supervisor"`, ID `sup_{periodId}_{employeeId}_{supervisorId}` (`src/lib/services/supervisor-assessment.ts:29-35`). Tidak ada dokumen `assessment_answers` terpisah untuk atasan — nilai disimpan langsung di `dimensionScores` (3 angka) pada dokumen `Assessment` itu sendiri (`saveSupervisorAssessment`, `supervisor-assessment.ts:145-234`).

Soal disnapshot atau hanya ID? **Hanya ID referensi** (`questionId`), plus `kompetensiId` disalin sebagai snapshot parsial saat jawaban disimpan (`self-assessment.ts:415-423`, field `kompetensiId: input.question.kompetensiId`). Teks soal (`text`), tipe (`type`), dan opsi (`options`) TIDAK disalin ke `AssessmentAnswer`.

## 3. CompetencyScore

Didefinisikan di `src/types/assessment.ts:56-63`:
```ts
export interface CompetencyScore {
  kompetensiId: string;
  selfScore: number | null;
  supervisorScore: number | null;
  requiredLevel: number | null;
  actualLevel: number | null;
  gap: number | null;
}
```
Hasil pencarian di seluruh `src/`: hanya 2 kemunculan —
- `src/types/assessment.ts:56` (definisi)
- `src/types/index.ts:41` (re-export lewat barrel `export type { ..., CompetencyScore, ... } from "./assessment"`)

TIDAK ADA file lain (service, hook, komponen, halaman) yang meng-import atau memakai `CompetencyScore`.

## 4. Type yang Sudah Ada Tapi Belum Dipakai

`StandarKompetensi`, `src/types/competency.ts:45-52`:
```ts
/** Standar kompetensi yang wajib dimiliki suatu jabatan. Belum dipakai di UI. */
export interface StandarKompetensi extends Activatable, Auditable {
  id: string;
  jabatanId: string;
  kompetensiId: string;
  requiredLevelId: string;
  requiredLevel: number;
}
```
`Questionnaire`, `src/types/question.ts:27-33`:
```ts
export interface Questionnaire extends Activatable, Auditable {
  id: string;
  name: string;
  description: string | null;
  questionIds: string[];
  periodId: string | null;
}
```
`SystemParameter`, `src/types/parameter.ts:6-12`:
```ts
/** Parameter sistem yang dikelola dari Admin Panel. */
export interface SystemParameter extends Activatable, Auditable {
  id: string;
  key: string;
  value: string;
  valueType: ParameterValueType;
  description: string | null;
}
```

## 5. Cookie & Middleware

Cookie di-set di `src/lib/auth/session.ts:177-183` (`setAuthCookies`):
```ts
document.cookie = `${AUTH_COOKIE_NAME}=1; Path=/; SameSite=Lax`;
document.cookie = `${AUTH_ROLE_COOKIE_NAME}=${role}; Path=/; SameSite=Lax`;
```
Isi persis: **bukan** ID token, bukan UID, bukan JSON — dua cookie plain string terpisah: `tna-auth` selalu berisi literal `"1"`, dan `tna-role` berisi salah satu string role (`super_admin`/`admin`/`moderator`/`pegawai`). Nama konstanta di `src/lib/auth/constants.ts:1-2`.

Di `src/middleware.ts:13-14`:
```ts
const hasSession = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
const role = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value as UserRole | undefined;
```
Tidak ada verifikasi tanda tangan / signature apa pun (tidak ada pemanggilan `firebase-admin`, `jwt.verify`, atau sejenisnya di file ini). Cookie **hanya dibaca dan dipercaya begitu saja** (perbandingan string literal).

## 6. Firestore Rules — 16 Collection

| Collection | Status |
|---|---|
| users | ADA RULE (`firestore.rules:47`) |
| unit_kerja | ADA RULE (`:69`) |
| jabatan | ADA RULE (`:74`) |
| pangkat | ADA RULE (`:79`) |
| tusi | ADA RULE (`:84`) |
| kompetensi | ADA RULE (`:89`) |
| kompetensi_levels | ADA RULE (`:94`) |
| standar_kompetensi | ADA RULE (`:99`) |
| questions | ADA RULE (`:104`) |
| questionnaires | ADA RULE (`:109`) |
| system_parameters | ADA RULE (`:114`) |
| assessment_periods | ADA RULE (`:119`) |
| assessments | ADA RULE (`:124`) |
| assessment_answers | ADA RULE (`:153`) |
| training_proposals | ADA RULE (`:159`) |
| tna_recaps | ADA RULE (`:179`) |

Catch-all (`match /{document=**}`) di akhir file: **TIDAK ADA**. File `firestore.rules` ditutup langsung setelah blok `tna_recaps` (baris 179-182), lalu penutup `}` untuk `match /databases/{database}/documents` (baris 183) dan `service cloud.firestore` (baris 184). Tanpa catch-all, path yang tidak match rule manapun otomatis DITOLAK (default-deny Firestore).

## 7. tna.ts & use-tna.ts

`src/lib/services/tna.ts` — fungsi yang diekspor:
- `mapTnaError(error)` — memetakan error jadi pesan Bahasa Indonesia untuk UI.
- `getTnaPeriodSummaries()` — ringkasan per periode: total pegawai, jumlah self/supervisor submitted, jumlah usulan, status sudah-digenerate.
- `getTnaEmployeeDetails(periodId)` — daftar pegawai + self assessment + supervisor assessment untuk satu periode.
- `generateTnaRecap(periodId, actorId)` — membuat dokumen `training_proposals` dan `tna_recaps` dari penilaian atasan yang sudah submit.
- (kelas `TnaServiceError` juga diekspor, bukan fungsi.)

`src/hooks/use-tna.ts` — fungsi yang diekspor:
- `useTnaPeriodSummaries()` — hook React yang memanggil `getTnaPeriodSummaries()`, mengelola state loading/error/reload.
- `useTnaEmployeeDetails(periodId)` — hook React yang memanggil `getTnaEmployeeDetails(periodId)`, state loading/error/reload.

Jawaban tegas: file ini **hanya menghitung agregat per unit kerja**, BUKAN gap per kompetensi per pegawai. Bukti: `scoresByUnit` di `tna.ts:236-240` dikelompokkan per `unitKerjaId`, lalu `averageGap` dihitung satu kali per unit (`tna.ts:283-291`), tidak per `kompetensiId` dan tidak per pegawai individual.

Sumber angka pembanding: `averageGap = Math.round((5.0 - avgScore) * 10) / 10` (`tna.ts:289`) — `avgScore` adalah rata-rata `overallScore` (skor mentah rata-rata 3 dimensi) dari penilaian atasan yang submitted di unit tersebut. Angka **5.0** adalah **literal hardcoded** di kode, bukan dibaca dari `standar_kompetensi`, `kompetensi_levels`, atau `system_parameters` manapun — tidak ada nilai standar tersimpan yang dijadikan pembanding, hanya konstanta tertulis langsung di `tna.ts:289`.
