# Sistem Penilaian Kompetensi Pegawai & TNA

Dokumen serah terima untuk pengembang berikutnya. Panduan penggunaan untuk admin/pegawai BLK ada di halaman **`/bantuan`** di dalam aplikasi — dokumen ini untuk orang yang akan membaca/mengubah kode.

## 1. Ringkasan

Aplikasi web untuk menilai kompetensi pegawai (penilaian diri + penilaian atasan) dan menyusun **TNA (Training Needs Analysis)** — rekap kebutuhan pelatihan berbasis gap antara kompetensi aktual pegawai dan standar kompetensi jabatannya. Dibangun untuk **satu Balai Pelatihan Kesehatan (BLK)**, skala puluhan pegawai dalam satu instansi — bukan aplikasi multi-tenant atau skala ribuan pengguna. Skala kecil ini adalah alasan sadar di balik banyak keputusan arsitektur di dokumen ini (tidak ada backend terpisah, tidak ada automated test, validasi manual lewat skrip sekali-pakai) — cukup untuk kebutuhan satu instansi, tapi jangan dianggap pola yang otomatis aman untuk skala lebih besar. Sebelum aplikasi ini, penilaian kompetensi dan penyusunan usulan pelatihan dilakukan manual/tersebar; aplikasi ini menyatukannya jadi satu alur terstruktur dari data kepegawaian sampai rekap pelatihan per unit kerja.

## 2. Alur Bisnis

```
Identitas → Tempat Tugas → TUSI → Kuesioner Penilaian Diri
    → Penilaian Kompetensi Individu (Self + Atasan + Rekomendasi)
        → Rekap Usulan Pelatihan → Rekap TNA
```

| Tahap | Di aplikasi | Collection Firestore |
|---|---|---|
| Identitas | Akun pegawai (role, status) | `users` |
| Tempat Tugas | Penempatan: Unit Kerja, Jabatan, Pangkat/Golongan | `unit_kerja`, `jabatan`, `pangkat` |
| TUSI | Tugas Pokok & Fungsi yang diampu pegawai (opsional — memengaruhi soal mana yang diprioritaskan di kuesioner, bukan syarat wajib) | `tusi` |
| Kuesioner Penilaian Diri | Bank Soal (likert/ya-tidak/pilihan ganda) + pengisian mandiri pegawai | `questions`, `assessments` (`type: self`), `assessment_answers` |
| Penilaian Kompetensi Individu | Skor 3 dimensi dari atasan + rekomendasi bebas teks, digabung dengan skor diri jadi skor per kompetensi | `assessments` (`type: supervisor`) |
| Rekap Usulan Pelatihan | Rekomendasi atasan disalin per pegawai saat admin generate rekap | `training_proposals` |
| Rekap TNA | Agregat gap per unit kerja, dibuat manual oleh admin (tombol "Generate Rekap TNA") | `tna_recaps` |

**Rumus gap** (`src/lib/services/competency-score.ts`, `computeEmployeeCompetencyScores()`):
```
actualLevel = skorAtasan * bobotAtasan + skorDiri * bobotSelf   (default bobot: 0.7 / 0.3)
gap         = requiredLevel (dari Standar Kompetensi jabatan) - actualLevel
butuhPelatihan = gap >= ambangButuhPelatihan   (default 1.0)
```
Bobot dan ambang bisa diubah admin di `/admin/parameter` (`system_parameters/global`) tanpa redeploy. Hanya jawaban soal **likert** yang dihitung ke skor diri — soal `yes_no`/`multiple_choice` memakai skala berbeda dan sengaja dikeluarkan dari rumus ini.

**Tes Pengetahuan** (soal pilihan ganda, opsional, satu kali per periode) hasilnya **TIDAK PERNAH** masuk ke `actualLevel`/`gap`/`butuhPelatihan` — murni kolom informasi terpisah ("Validasi Tes": Sesuai/Perlu Ditinjau) untuk bahan pertimbangan atasan, dibaca langsung dari `test_sessions`, sama sekali tidak menyentuh rumus di atas.

## 3. Stack & Arsitektur

Versi dari `package.json` (jangan asumsikan versi lain tanpa cek ulang):

| | Versi |
|---|---|
| Next.js | 15.5.23 (App Router, Turbopack) |
| React / React DOM | 19.1.0 |
| TypeScript | ^5 |
| Firebase (client SDK) | ^12.17.1 |
| firebase-admin | ^13.10.0 |
| Tailwind CSS | ^4 |
| shadcn/ui + Base UI (`@base-ui/react`) | ^4.18.0 / ^1.7.0 |
| zod | ^4.4.3 |
| Node (untuk emulator) | — perlu **Java 17+** juga, dipakai Firestore/Auth Emulator |

**TIDAK ada Cloud Functions, TIDAK ada Next.js API Route.** Folder `functions/` tidak ada; `src/app/api` tidak ada. Seluruh logika bisnis — hitung gap kompetensi, generate Rekap TNA, submit & nilai Tes Pengetahuan, kelola master data — berjalan sebagai kode client (`firebase/firestore` client SDK) yang jalan di browser pengguna dan menulis langsung ke Firestore. `firebase-admin` (`src/lib/firebase/admin.ts`) terpasang tapi **tidak diimpor dari `src/app` mana pun** — satu-satunya pemakainya adalah `scripts/*.ts` yang dijalankan manual di komputer developer (mis. `scripts/seed-dev.ts`), bukan bagian dari aplikasi yang di-deploy.

**`firestore.rules` adalah satu-satunya penegak keamanan**, bukan pelengkap. Middleware (`src/middleware.ts`) dan `AuthGate`/`guards.ts` di client hanya mengatur pengalihan halaman (UX) — keduanya bisa dilewati dari console browser (ganti cookie, panggil Firestore langsung), tapi `firestore.rules` tetap menolak operasi yang tidak sah terlepas dari apa yang UI izinkan.

**Ini keputusan sadar, bukan kelalaian**: untuk skala satu instansi/puluhan pegawai, biaya membangun & mengoperasikan backend terpisah (Cloud Functions atau route handler + Admin SDK) tidak sepadan dengan manfaatnya. Trade-off yang diterima dan didokumentasikan secara eksplisit di sini (lihat §7 Utang Teknis): tidak ada verifikasi session server-side kriptografis, dan skor Tes Pengetahuan secara teori bisa dikarang lewat DevTools karena tidak ada server yang menghitung ulang secara independen.

## 4. Setup dari Nol (lokal)

**Prasyarat**: Node.js, Java 17+ (`java -version`), npm.

```bash
npm install
copy .env.local.example .env.local     # sudah terisi nilai dummy emulator, tidak perlu diedit untuk mulai
```

Dua terminal:
```bash
# Terminal 1 — emulator (Auth :9099, Firestore :8080, UI :4000)
npm run emulators

# Terminal 2 — isi data awal, lalu jalankan app
npm run seed        # atau: npm run seed:dev
npm run dev          # → http://localhost:3000
```

Akun seed (`scripts/seed-dev.ts`), password sama untuk semua — **`password123`**:

| Email | Role | Catatan |
|---|---|---|
| `admin@seed.test` | `super_admin` | akses penuh `/admin` |
| `atasan@seed.test` | `pegawai` | jabatan Kasubbag, punya bawahan (untuk uji menu Penilaian Atasan) |
| `pegawai-a@seed.test` | `pegawai` | skor tinggi (data uji gap kecil) |
| `pegawai-b@seed.test` | `pegawai` | skor rendah (data uji gap besar + kasus tepi ambang) |

**Dev SELALU tersambung ke emulator**, kecuali `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` diset eksplisit di `.env.local` (`shouldUseFirebaseEmulator()` di `src/lib/firebase/env.ts`: default `NODE_ENV !== "production"` → emulator = `true`). Ini pengaman sengaja supaya `npm run dev` tidak pernah diam-diam menyambung ke Firebase produksi hanya karena env var lupa diisi.

## 5. Deploy

### Firebase
1. Buat project Firebase (atau pakai yang sudah ada), aktifkan **Firestore Database**.
2. **Authentication → Sign-in method**: aktifkan **Email/Password** dan **Google**.
3. Deploy rules + indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project <PROJECT_ID>
   ```
4. **Authentication → Settings → Authorized domains**: tambahkan domain Vercel-nya (mis. `nama-app.vercel.app`) — tanpa ini, popup Google sign-in ditolak di produksi.

### Vercel
1. Import repo, deploy.
2. Set **4 env var wajib** (dari Firebase Console → Project Settings → General → Your apps → SDK config) — lihat `.env.example` untuk daftar lengkap + komentar:
   `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
3. **Jangan** set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` di Vercel (biarkan kosong). Vercel otomatis `NODE_ENV=production` saat build, jadi aplikasi otomatis memakai Firebase sungguhan — asal flag ini tidak dipaksa `true`.
4. `FIREBASE_ADMIN_*` **tidak perlu diisi di Vercel** (lihat §3 — tidak dipakai aplikasi yang di-deploy).

### Membuat super_admin pertama di database kosong
Tidak ada halaman "setup wizard" — dokumen pertama dibuat manual:
1. Firestore Console → buat dokumen di collection **`user_invitations`**, ID dokumen = email calon admin **huruf kecil semua** (mis. `admin@instansi.go.id`). Isi field: `email` (string, sama persis dgn ID), `role` (string, **`"super_admin"`**), `namaLengkap` (string), `unitKerjaId`/`jabatanId`/`supervisorId` (null).
   > **WAJIB**: field `usedAt` harus dibuat eksplisit bertipe **null** — jangan biarkan field itu tidak ada sama sekali. Firestore membedakan "field tidak ada" dari "field bernilai null"; ini pernah jadi insiden produksi nyata (lihat `docs/konteks.md`, "Insiden Produksi: usedAt Hilang") yang membuat pendaftaran gagal total. `firestore.rules` versi saat ini sudah tahan terhadap field yang hilang (`.data.get('usedAt', null)`), tapi tetap tulis eksplisit — itu bentuk yang dihasilkan alur normal aplikasi (`createInvitation()`), jangan menyimpang tanpa alasan.
2. Buka `/register` di aplikasi, daftar dengan email yang **sama persis**, atau masuk lewat tombol Google dengan email itu.
3. Kalau daftar lewat email/password: cek email untuk tautan verifikasi (`/verifikasi-email` akan menahan sampai diklik). Google **tidak perlu** langkah ini — Firebase menandai email Google sebagai terverifikasi otomatis.
4. Setelah masuk, cek Firestore: dokumen `users/{uid}` baru terbentuk dengan `role: "super_admin"`, `status: "aktif"`.

## 6. Model Data (Firestore)

| Collection | Fungsi |
|---|---|
| `users` | Akun pengguna: identitas, role, status, penempatan, atasan (`supervisorId`) |
| `user_invitations` | Undangan pendaftaran mode "tertutup" (ID = email huruf kecil) |
| `unit_kerja` | Struktur organisasi hierarkis |
| `jabatan` | Master jabatan |
| `pangkat` | Master pangkat/golongan |
| `tusi` | Tugas Pokok & Fungsi per unit kerja |
| `kompetensi` | Master kompetensi (dimensi: pengetahuan/keterampilan/sikap) |
| `kompetensi_levels` | Skala level kompetensi global (1–5) |
| `standar_kompetensi` | Target level kompetensi per jabatan (satu dokumen per jabatan) |
| `questions` | Bank soal (likert / ya-tidak / pilihan ganda) |
| `question_answer_keys` | Kunci jawaban pilihan ganda — collection terpisah, gerbang baca per-periode |
| `questionnaires` | **Dideklarasikan di tipe & rules, tidak pernah dipakai kode** — fitur belum dibangun |
| `assessment_periods` | Periode penilaian (hanya satu boleh `active`) |
| `assessments` | Penilaian diri (`type: self`) dan penilaian atasan (`type: supervisor`) |
| `assessment_answers` | Jawaban soal per assessment |
| `test_sessions` | Hasil Tes Pengetahuan opsional per pegawai per periode |
| `training_proposals` | Usulan pelatihan (teks bebas dari atasan) |
| `tna_recaps` | Rekap TNA agregat per unit kerja per periode |
| `system_parameters` | Satu dokumen global (`system_parameters/global`): bobot skor, ambang, mode pendaftaran, template prompt AI, dll |

## 7. Utang Teknis

| Item | Dampak nyata | Arah perbaikan |
|---|---|---|
| **Middleware belum verifikasi session cookie secara kriptografis** (`src/middleware.ts`) | Cookie `tna-auth`/`tna-role` cuma string biasa yang bisa diubah dari console browser. Middleware jadi murni UX (redirect cepat), **bukan** batas keamanan — `firestore.rules` tetap menolak operasi yang tidak sah terlepas dari isi cookie, jadi tidak ada data yang bocor, tapi seseorang bisa "menipu" tampilan UI untuk sesaat sebelum Firestore menolak permintaannya. | Middleware Next.js Edge Runtime tidak kompatibel dengan `firebase-admin` (butuh Node runtime, opt-in eksperimental `nodeMiddleware`). Bahkan dengan itu, role/status hidup di Firestore bukan custom claims — perlu sinkronisasi `setCustomUserClaims` di setiap perubahan role/status. Ditandai "A5" di `docs/konteks.md`. |
| **Skor Tes Pengetahuan dihitung di client** (`src/lib/services/test-session.ts`, `submitTestSession()`) | Rules memastikan skor hanya bisa ditulis SEKALI (transisi `null`→terisi) dan jawaban mentah terkunci permanen sejak submit — tapi rules Firestore tidak bisa memverifikasi angka skornya benar secara matematis (tidak bisa iterasi array + `get()` per elemen). Pegawai yang paham DevTools secara teori bisa menulis skor palsu satu kali. | Butuh Cloud Functions atau route handler + Admin SDK yang menghitung ulang skor sendiri dari jawaban + kunci sebelum menyetujui penulisan — sama seperti utang A5, ditolak untuk skala project ini. |
| **Kunci jawaban pilihan ganda butuh "Segarkan" manual tiap periode baru** (`/admin/soal`, tombol "Segarkan Kunci Jawaban") | Gerbang baca kunci jawaban bersifat per-periode (`question_answer_keys.periodeId` harus cocok `test_sessions` periode aktif pembaca) — soal lama yang dipakai lagi TIDAK otomatis ikut pindah periode. Kalau admin lupa, Tes Pengetahuan pegawai macet di "Menghitung..." dan tidak pernah selesai. | Ada peringatan otomatis di `/admin/soal` kalau ada kunci yang stale, tapi tetap bergantung admin memperhatikannya — bukan dicegah sistem. Alternatif (pointer periode aktif terpusat di rules) sudah dievaluasi dan ditolak karena menambah kompleksitas tak sepadan (lihat `docs/konteks.md`). |
| **Tidak ada automated test** (`package.json` tidak punya Jest/Vitest/Playwright/script `test`) | Regresi hanya tertangkap lewat `tsc --noEmit` + `eslint` + pengujian manual/skrip sekali-pakai terhadap emulator (dihapus setelah dipakai, tidak masuk repo) — tidak ada jaring pengaman otomatis di CI. | Untuk skala project ini belum jadi prioritas; kalau ditambah, mulai dari `computeEmployeeCompetencyScores()` dan alur registrasi (paling sering jadi sumber bug tersembunyi). |
| **"Hanya Super Admin" untuk Segarkan Kunci Jawaban & Hapus Permanen Soal ditegakkan di lapisan aplikasi, bukan sepenuhnya di rules** | `question_answer_keys` write masih `isAdmin()` biasa di rules (bukan `isSuperAdmin()`) — admin biasa yang menulis langsung ke Firestore di luar UI secara teknis masih bisa melakukannya. `questions` delete SUDAH `isSuperAdmin()` di rules. | Bukan celah baru (perilaku rules lama), tapi belum ditutup rapat untuk aksi spesifik ini — lihat `docs/konteks.md` bagian "Segarkan Kunci Jawaban". |

## 8. Hal yang Mudah Bikin Terjebak

- **Field yang tidak ada di dokumen Firestore ≠ field bernilai `null` di `firestore.rules`.** `resource.data.field == null` **error** (dianggap `false`/ditolak) kalau `field` tidak ada sama sekali di dokumen — beda dari field yang eksplisit `null`. Ini insiden produksi nyata (lihat `docs/konteks.md`). Pola aman: `resource.data.get('field', null) == null`.
- **Menu "Penilaian Atasan" hanya muncul** kalau ADA pegawai lain yang field `supervisorId`-nya menunjuk ke akun itu (`useHasSubordinates()` → query `users` where `supervisorId == uid`). Field ini diisi di halaman **edit profil bawahan**, bukan di profil atasan sendiri — sumber kebingungan paling umum saat demo/testing.
- **Kolom "Domain email diizinkan"** di Parameter Sistem diisi **domain saja** (`instansi.go.id`), **bukan** alamat email lengkap (`nama@instansi.go.id`).
- **WAJIB klik "Segarkan Kunci Jawaban"** di `/admin/soal` setiap kali periode penilaian baru dibuka, **sebelum** pegawai mulai mengerjakan Tes Pengetahuan — lihat §7.
- **Soal pilihan ganda butuh periode aktif SUDAH ADA sebelum disimpan** (`applyAnswerKey()` di `question.ts` melempar error kalau belum ada periode aktif) — urutan setup yang benar: buat & aktifkan Periode Penilaian dulu, baru buat Bank Soal pilihan ganda (lihat panduan "Memulai dari Nol" di `/bantuan`).
- **`firebase-admin`/`src/lib/firebase/admin.ts` tidak dipakai aplikasi yang di-deploy** (§3) — jangan berasumsi ada endpoint server yang bisa dipanggil untuk operasi admin-only; semua operasi lewat client SDK dan ditentukan oleh `firestore.rules`.

## 9. Kredit

**Sistem Penilaian Kompetensi Pegawai & TNA**
Dikembangkan oleh Sinta Javani & Team
