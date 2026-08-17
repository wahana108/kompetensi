# AUDIT.md

**Tanggal audit**: 17 Agustus 2026
**Cakupan**: seluruh `src/`, konfigurasi Firebase di root, `docs/project.md`, `docs/konteks.md`. `node_modules/`, `.next/`, `.git/`, file lock diabaikan.

## Ringkasan (5 baris)

1. Project Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, dengan Firebase (client SDK + admin SDK) sudah terpasang dan dikonfigurasi untuk mode emulator maupun produksi.
2. Auth (email/password + Google) berbasis Firebase Auth sudah berjalan; role disimpan di dokumen Firestore `users/{uid}.role`, dijaga cookie non-httpOnly untuk UX dan `firestore.rules` sebagai sumber kebenaran.
3. Sembilan modul master data (Unit Kerja, Jabatan, Pangkat, TUSI, Level Kompetensi, Kompetensi, Bank Soal, Periode Penilaian, Pengguna) punya CRUD lengkap (list/baru/edit) di Admin Panel — tidak ada halaman placeholder yang ditemukan.
4. Alur inti Self Assessment → Penilaian Atasan → generate Rekap TNA (manual, tombol admin) sudah terimplementasi end-to-end dengan Firestore, termasuk `firestore.rules` per-role.
5. Yang belum ada: Cloud Functions (folder `functions/` tidak ada meski direferensikan `firebase.json`/`npm run emulators:all`), relasi `standar_kompetensi` (target level per jabatan) tidak dipakai di kode manapun, dan perhitungan gap kompetensi hanya agregat sederhana (5.0 − rata-rata skor atasan per unit), bukan per-kompetensi/per-pegawai memakai `CompetencyScore`.

## Tabel Modul

| Modul | Status | File terkait | Catatan |
|---|---|---|---|
| Auth (login/register/logout, Google + email) | SELESAI | `src/lib/auth/session.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/components/auth/auth-provider.tsx`, `src/components/auth/auth-gate.tsx` | Role disimpan Firestore; cookie `tna-auth`/`tna-role` hanya untuk UX/middleware, bukan session token bertanda tangan. |
| Middleware / proteksi route | SELESAI (level cookie) | `src/middleware.ts` | Redirect berbasis keberadaan cookie, bukan verifikasi token/session server-side. |
| Master data: Unit Kerja | SELESAI | `src/lib/services/unit-kerja.ts`, `src/app/(admin)/admin/unit-kerja/**` | Hierarkis dengan `parentId`/`path`/`level`. |
| Master data: Jabatan | SELESAI (parsial field) | `src/lib/services/jabatan.ts`, `src/app/(admin)/admin/jabatan/**` | Field `unitKerjaId`/`tusiIds`/`description` disimpan tapi belum diekspos di form (menurut komentar kode & `konteks.md`). |
| Master data: Pangkat | SELESAI | `src/lib/services/pangkat.ts`, `src/app/(admin)/admin/pangkat/**` | — |
| Master data: TUSI | SELESAI (parsial field) | `src/lib/services/tusi.ts`, `src/app/(admin)/admin/tusi/**` | `kompetensiIds` disimpan default `[]`, belum diekspos di UI. |
| Master data: Level Kompetensi | SELESAI | `src/lib/services/kompetensi-level.ts`, `src/app/(admin)/admin/level-kompetensi/**` | Skala global (`kompetensiId: null`). |
| Master data: Kompetensi | SELESAI (parsial field) | `src/lib/services/kompetensi.ts`, `src/app/(admin)/admin/kompetensi/**` | `category` default `lainnya`, belum diekspos. |
| Standar Kompetensi (target level per jabatan) | BELUM ADA | `src/types/competency.ts` (`StandarKompetensi`), `firestore.rules` match `standar_kompetensi` | Tipe & rules ada, tidak ada service/hook/halaman UI. Comment di kode: "Belum dipakai di UI". |
| Bank Soal | SEBAGIAN | `src/lib/services/question.ts`, `src/app/(admin)/admin/soal/**` | Tipe `likert`, `yes_no` lengkap; `multiple_choice` disimpan `options: []` tanpa editor opsi di form. Tipe `open_text` didefinisikan di tipe data tapi ditolak eksplisit oleh validator (`normalizeQuestionInput` melempar error jika `open_text`). |
| Kuesioner (`questionnaires`) | BELUM ADA | `src/types/question.ts` (`Questionnaire`), `firestore.rules` match `questionnaires` | Tipe & rules ada, tidak ada service/hook/halaman yang membuat/membaca dokumen `questionnaires`. |
| Periode Penilaian | SELESAI | `src/lib/services/assessment-period.ts`, `src/app/(admin)/admin/periode/**` | Hanya satu periode `active`; lihat bagian 8 di bawah. |
| Pengguna (admin kelola role/penempatan) | SELESAI | `src/lib/services/pengguna.ts`, `src/app/(admin)/admin/pengguna/**` | Cegah siklus atasan-bawahan, cegah Super Admin terakhir diturunkan. |
| Self Assessment (kuesioner pegawai) | SELESAI | `src/lib/services/self-assessment.ts`, `src/app/(dashboard)/dashboard/penilaian/**`, `src/components/dashboard/self-assessment-form.tsx` | Auto-create draft, pemilihan soal berbasis TUSI → kompetensi → umum → semua. |
| Penilaian Atasan | SELESAI | `src/lib/services/supervisor-assessment.ts`, `src/app/(dashboard)/dashboard/penilaian-atasan/**`, `src/components/dashboard/supervisor-assessment-form.tsx` | 3 skor dimensi (bukan per-soal/per-kompetensi) + rekomendasi bebas teks. |
| Perhitungan gap kompetensi individual | BELUM ADA (bentuk formal) | `src/types/assessment.ts` (`CompetencyScore` — tidak dipakai di kode manapun selain deklarasi tipe) | Tidak ada fungsi yang mengisi `requiredLevel`/`actualLevel`/`gap` per kompetensi per pegawai. |
| Rekap TNA & Usulan Pelatihan | SELESAI (versi agregat sederhana) | `src/lib/services/tna.ts`, `src/app/(admin)/admin/tna/**` | `generateTnaRecap()` manual (tombol admin); gap dihitung `Math.round((5.0 - avgScore) * 10) / 10` per unit kerja dari rata-rata `overallScore` penilaian atasan — bukan per kompetensi. Usulan pelatihan = free text atasan, disalin jadi `training_proposals`. |
| Parameter Sistem | BELUM ADA | `src/types/parameter.ts` (`SystemParameter`), `firestore.rules` match `system_parameters` | Tipe & rules ada, tidak ada service/hook/halaman UI. |
| Cloud Functions | BELUM ADA | `firebase.json` (referensi port emulator `functions`), `package.json` script `emulators:all` | Folder `functions/` tidak ditemukan di root. `konteks.md` mencatat eksplisit "jangan dipakai sampai folder functions/ ada". |
| Halaman publik `/` | STUB (redirect saja) | `src/app/page.tsx` | Langsung `redirect("/login")`, tidak ada landing page. |

## Tabel Collection Firestore

Diambil dari `src/lib/firebase/collections.ts` (`COLLECTIONS`) dan pemakaian nyata di `src/lib/services/*.ts` / `src/types/*.ts`. Kolom "Dipakai di kode" menandai apakah ada service/hook yang benar-benar membaca/menulis collection tsb (bukan sekadar dideklarasikan di `collections.ts`/`firestore.rules`).

| Collection (nama Firestore) | Dipakai di kode | Field (dari tipe & mapper) |
|---|---|---|
| `users` | Ya | `id, email, displayName, photoURL, nip, role, supervisorId, unitKerjaId, jabatanId, pangkatId, tusiIds, isActive, createdAt, updatedAt, createdBy, updatedBy` |
| `unit_kerja` | Ya | `id, name, code, parentId, level, path, sortOrder, isActive, createdAt, updatedAt, createdBy, updatedBy` |
| `jabatan` | Ya | `id, name, code, eselon, description, unitKerjaId, tusiIds, sortOrder, isActive, +audit` |
| `pangkat` | Ya | `id, name, golongan, sortOrder, isActive, +audit` |
| `tusi` | Ya | `id, name, code, description, unitKerjaId, jabatanId, kompetensiIds, sortOrder, isActive, +audit` |
| `kompetensi` | Ya | `id, name, code, description, dimensi, category, levelIds, sortOrder, isActive, +audit` |
| `kompetensi_levels` | Ya | `id, kompetensiId, level, code, name, description, minScore, maxScore, sortOrder, isActive, +audit` |
| `standar_kompetensi` | TIDAK DITEMUKAN (hanya tipe + rules) | Tipe: `id, jabatanId, kompetensiId, requiredLevelId, requiredLevel, isActive, +audit` |
| `questions` | Ya | `id, code, text, type, kompetensiId, tusiId, dimensi, scaleMin, scaleMax, options[{value,label,score}], sortOrder, isActive, +audit` |
| `questionnaires` | TIDAK DITEMUKAN (hanya tipe + rules) | Tipe: `id, name, description, questionIds[], periodId, isActive, +audit` |
| `assessment_periods` | Ya | `id, name, year, startsAt, endsAt, status(draft/active/closed), questionnaireId, +audit` |
| `assessments` | Ya | `id, periodId, employeeId, assessorId, type(self/supervisor), status(draft/submitted/reviewed/completed), assignment{unitKerjaId,jabatanId,pangkatId,tusiIds,capturedAt}, overallScore, recommendationNote, dimensionScores{pengetahuan,keterampilan,sikap_perilaku}, submittedAt, reviewedAt, +audit` |
| `assessment_answers` | Ya | `id, assessmentId, questionId, kompetensiId, value, score, note` |
| `training_proposals` | Ya | `id, periodId, assessmentId, employeeId, proposedBy, kompetensiId, title, reason, priority, status(draft/proposed/approved/rejected), +audit` |
| `tna_recaps` | Ya | `id, periodId, unitKerjaId, kompetensiId, title, employeeCount, averageGap, priority, sourceProposalIds[], notes, generatedAt, generatedBy, +audit` |
| `system_parameters` | TIDAK DITEMUKAN (hanya tipe + rules) | Tipe: `id, key, value, valueType(string/number/boolean/json), description, isActive, +audit` |

## Dependency Utama (package.json)

| Paket | Versi |
|---|---|
| next | 15.5.23 |
| react / react-dom | 19.1.0 |
| typescript | ^5 |
| firebase (client SDK) | ^12.17.1 |
| firebase-admin | ^13.10.0 |
| firebase-tools (dev) | ^15.27.0 |
| zod | ^4.4.3 |
| shadcn | ^4.18.0 |
| @base-ui/react | ^1.7.0 |
| tailwindcss | ^4 |
| lucide-react | ^1.31.0 |
| sonner, next-themes, tailwind-merge, class-variance-authority, clsx | terpasang (UI utilitas shadcn) |
| eslint / eslint-config-next | ^9 / 15.5.23 |

Tidak ada dependency testing (Jest/Vitest/Playwright) di `package.json`.

## Firebase — Ringkasan

- **File konfigurasi**: `firebase.json` (rules Firestore + indexes + emulator config Auth/Firestore/Functions/UI), `firestore.rules`, `firestore.indexes.json`, `.firebaserc`. **Tidak ada folder `functions/`.**
- **SDK**: dipakai **keduanya** — `src/lib/firebase/client.ts` (Firebase JS SDK, dipakai semua service di `src/lib/services/*`, client-side) dan `src/lib/firebase/admin.ts` (`firebase-admin`, ditandai `"server-only"`, tapi tidak ada pemanggil (`getAdminApp`/`getAdminAuth`/`getAdminDb`) yang ditemukan dipakai di route/server action manapun dalam `src/app/`).
- **Ringkasan `firestore.rules`** (185 baris):
  - Helper: `isSignedIn`, `userExists`, `userData`, `hasRole`, `isAdmin` (`super_admin`/`admin`), `isSuperAdmin`, `isModerator`, `isOwner`, `isSupervisorOf`.
  - `users`: baca oleh pemilik/admin/moderator/atasan langsung; create hanya oleh diri sendiri dengan `role: pegawai`; update `role`/`id` hanya Super Admin, Admin boleh ubah field lain, pemilik boleh ubah field selain `role/id/supervisorId`; delete selalu `false` (tidak ada hard delete).
  - Master data (`unit_kerja`, `jabatan`, `pangkat`, `tusi`, `kompetensi`, `kompetensi_levels`, `standar_kompetensi`, `questions`, `questionnaires`, `system_parameters`, `assessment_periods`): baca siapa saja yang login, tulis hanya `isAdmin()`.
  - `assessments`: baca oleh pemilik/assessor/admin/moderator/atasan; create dibatasi sesuai `type` (`self` oleh diri sendiri, `supervisor` oleh atasan sah); update oleh assessor/admin; delete hanya admin.
  - `assessment_answers`: baca/tulis oleh siapa saja yang login (tidak ada pembatasan kepemilikan eksplisit di rule ini).
  - `training_proposals`: baca oleh pemilik/pengusul/admin/moderator; create/update dibatasi kepemilikan/admin; delete hanya admin.
  - `tna_recaps`: baca siapa saja yang login, tulis admin atau moderator.

## Auth — Ringkasan

- Diimplementasikan lewat Firebase Authentication (`src/lib/auth/session.ts`): `signInWithEmail`, `signInWithGoogle`, `registerWithEmail`, `signOutCurrentUser`.
- Role (`super_admin | admin | moderator | pegawai`) disimpan di field `role` pada dokumen Firestore `users/{uid}` (bukan custom claims Firebase Auth). Ditulis via `ensureUserProfile()`/`buildDefaultProfile()` saat login/register pertama (default `pegawai`).
- Proteksi route berlapis:
  1. `src/middleware.ts` — cek cookie `tna-auth`/`tna-role` (bukan token bertanda tangan, murni string `"1"` + nilai role), redirect ke `/login` atau `/dashboard`/`/admin`.
  2. `src/components/auth/auth-gate.tsx` + `src/lib/auth/guards.ts` — cek `UserProfile` dari Firestore di sisi client (`requireAuthenticated`, `requireAdminArea`, dst).
  3. `firestore.rules` sebagai lapisan terakhir/sumber kebenaran.
- Relasi atasan-bawahan: field `supervisorId` pada `users`, bukan role terpisah (`hasSupervisor()` di `src/lib/auth/roles.ts`).

## Env Var yang Dirujuk Kode

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_USE_FIREBASE_EMULATOR
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
FIREBASE_ADMIN_USE_EMULATOR
FIREBASE_AUTH_EMULATOR_HOST      (di-set otomatis oleh kode, bukan dibaca dari .env user)
FIRESTORE_EMULATOR_HOST          (di-set otomatis oleh kode)
FIREBASE_FUNCTIONS_EMULATOR_HOST (di-set otomatis oleh kode)
```

`.env.local` dan `.env.local.example` ada di root (nilai tidak dibaca/ditampilkan dalam audit ini).

## Konsep "Periode Penilaian"

**Ada, dan menjadi poros utama alur aplikasi.** Diimplementasikan sebagai collection `assessment_periods` (`src/types/assessment.ts` → `AssessmentPeriod`, `src/lib/services/assessment-period.ts`). Field: `name`, `year`, `startsAt`, `endsAt` (format `YYYY-MM-DD`), `status` (`draft | active | closed`), `questionnaireId`. Aturan bisnis yang ditemukan di kode: hanya boleh ada satu periode berstatus `active` pada satu waktu (`deactivateOtherActive()` otomatis men-draft-kan periode aktif lain saat periode baru diaktifkan); pengisian self assessment hanya diizinkan jika periode `active` **dan** tanggal hari ini berada di antara `startsAt`–`endsAt` (`isPeriodFillable()`). Seluruh entitas transaksional (`assessments`, `training_proposals`, `tna_recaps`) direferensikan lewat `periodId`.

## Selisih antara `docs/project.md` / `docs/konteks.md` dan Kode Nyata

- `docs/project.md` menyebut **Firebase Cloud Functions (Node.js)** sebagai bagian dari "Backend Logic" — di kode, folder `functions/` tidak ada sama sekali; `konteks.md` sendiri sudah mencatat ini di bagian "Yang belum dikerjakan" (konsisten, bukan kontradiksi).
- `docs/project.md` mencantumkan **Moderator** sebagai role dengan akses "Monitoring & validasi hasil" — di kode, `isModerator()` hanya dipakai untuk hak baca tambahan pada `assessments`/`training_proposals`/`tna_recaps` dan hak tulis `tna_recaps`; tidak ada halaman UI khusus Moderator (tidak ada rute/nav yang membedakan tampilan untuk role ini secara eksplisit di `src/components/admin/nav.ts` atau `src/middleware.ts` — akses Moderator ke `/admin` bergantung pada `canAccessAdmin()` yang hanya mengizinkan `super_admin`/`admin`, sehingga Moderator sebenarnya **tidak bisa masuk area Admin** meski rules Firestore memberi mereka hak baca/tulis tertentu).
- `docs/project.md` menyebut modul **"Standar Kompetensi & Leveling"** sebagai satu modul — di kode ini terpecah: Level Kompetensi (`kompetensi_levels`) sudah SELESAI dengan UI penuh, tapi Standar Kompetensi (`standar_kompetensi`, target level per jabatan) BELUM ADA implementasinya sama sekali di luar tipe data dan rules.
- `docs/konteks.md` (poin 24) menyatakan Rekap TNA menghitung "gap rata-rata terhadap target skala 5.0" — ini akurat terhadap kode (`tna.ts`), tapi perlu digarisbawahi: ini bukan gap per kompetensi terhadap `requiredLevel` seperti tersirat oleh tipe `CompetencyScore` di `src/types/assessment.ts`, melainkan gap agregat per unit kerja dari `overallScore` (rata-rata 3 dimensi) atasan.
- `docs/konteks.md` "Yang belum dikerjakan" mencantumkan "Session cookie httpOnly" — dikonfirmasi di kode: cookie `tna-auth`/`tna-role` di-set lewat `document.cookie` di client (`src/lib/auth/session.ts`), tanpa flag `httpOnly`/`Secure`.
- `docs/konteks.md` tidak menyebutkan sama sekali collection `questionnaires` dan `system_parameters` sebagai "belum dikerjakan" secara eksplisit, padahal keduanya terdeklarasi penuh di tipe data (`src/types/question.ts`, `src/types/parameter.ts`) dan `firestore.rules`, tapi nihil implementasi service/UI — celah dokumentasi.
- Tidak ditemukan ketidaksesuaian pada modul yang menurut `konteks.md` sudah "selesai" (Unit Kerja, Jabatan, Pangkat, TUSI, Level Kompetensi, Kompetensi, Bank Soal, Periode, Pengguna, Self Assessment, Penilaian Atasan, Rekap TNA) — deskripsi detail per poin di `konteks.md` (field, aturan unik, ID deterministik) cocok dengan kode yang dibaca.

## 5 Risiko Teknis Terbesar

1. **Sumber kebenaran otorisasi client-side + cookie non-httpOnly**: role disimpan di `document.cookie` biasa (`tna-role`) dan dibaca middleware untuk keputusan redirect; nilai ini bisa dimodifikasi dari console browser. Mitigasi nyata satu-satunya adalah `firestore.rules`, tapi UI/route Next.js sendiri tidak punya lapisan verifikasi server-side (tidak ada session cookie Firebase yang diverifikasi `firebase-admin` di middleware atau server component).
2. **`firebase-admin` (admin SDK) terpasang dan dikonfigurasi (`src/lib/firebase/admin.ts`) tapi tidak dipanggil di manapun** dalam `src/app/` yang terbaca — artinya tidak ada API route/server action yang memverifikasi token di server; seluruh operasi Firestore (termasuk generate Rekap TNA yang melibatkan `writeBatch` lintas banyak dokumen) berjalan sepenuhnya di client dengan `firebase/firestore` client SDK, bergantung total pada `firestore.rules`.
3. **Tidak ada Cloud Functions**: agregasi Rekap TNA (`generateTnaRecap` di `src/lib/services/tna.ts`) dan seluruh side-effect penting (auto-create draft self assessment, deaktivasi periode aktif lain) berjalan sebagai kode client biasa yang dipanggil dari tombol UI — rawan race condition antar pengguna (mis. dua admin generate TNA bersamaan) dan tidak ada auditing/logging server-side terpusat.
4. **Perhitungan gap kompetensi belum granular**: tipe `CompetencyScore` (per kompetensi, per pegawai, dengan `requiredLevel`/`actualLevel`/`gap`) sudah didefinisikan tapi tidak dipakai; gap yang benar-benar dihitung (`tna.ts`) adalah agregat per unit kerja dari `overallScore` 3 dimensi. Jika kebutuhan bisnis sebenarnya adalah TNA per kompetensi/per jabatan (sesuai `standar_kompetensi` yang juga belum diimplementasikan), fitur inti belum menutupi kebutuhan itu.
5. **Tidak ada automated test** (`package.json` tidak punya dependency test runner atau script `test`) untuk logika bisnis yang cukup kompleks — pemilihan soal self assessment (`selectQuestionsForSelfAssessment`), penguncian periode/assessment, dan agregasi rekap TNA — sehingga regresi hanya tertangkap lewat `tsc --noEmit` + `eslint` + pengujian manual di emulator.
