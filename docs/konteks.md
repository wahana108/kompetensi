# Konteks Project Saat Ini

**Update Terakhir**: 18 Agustus 2026

## Status Saat Ini
- Fondasi Next.js 15 + shadcn/ui + data model + Auth/Role sudah ada.
- **Auth siap ditest lewat Firebase Emulator** (Auth + Firestore + UI).
- **Admin Panel fondasi sudah ada**: layout (sidebar + header + konten) dipakai semua `/admin/*`.
- **Master Data Unit Kerja, Jabatan, Pangkat/Golongan, TUSI, Level Kompetensi, Kompetensi, dan Bank Soal sudah ada**.
- `.env.local` sudah diisi nilai dummy emulator (`demo-tna-kompetensi`).
- Panduan: `docs/SETUP-EMULATOR.md`.
- **Periode Penilaian, Self Assessment, pengelolaan Pengguna, dan Penilaian Atasan sudah ada.**
- **Modul Rekap TNA & Usulan Pelatihan sudah selesai dibuat** (`/admin/tna` dan `/admin/tna/[periodeId]`).
- **Standar Kompetensi per jabatan sudah ada** (`/admin/standar-kompetensi`), dan **Rekap TNA sekarang menghitung gap dari skor per kompetensi nyata** (bukan lagi angka tetap `5.0`). Lihat bagian "Standar Kompetensi & Gap per Kompetensi" di bawah.
- **Kontrol akses akun (status pending/aktif/nonaktif), undangan pendaftaran mode tertutup, dan halaman Parameter Sistem sudah ada.** Lihat bagian "Kontrol Akses & Parameter Sistem" di bawah. Diuji langsung lewat emulator (alur daftar tanpa undangan ditolak + rollback akun Auth; alur daftar dengan undangan berhasil + status aktif + undangan tertandai terpakai).
- `tsc --noEmit` dan `npm run lint` lulus 100% tanpa error.
- Emulator sudah diverifikasi start di mesin ini (Java 21): Auth `:9099`, Firestore `:8080`, UI `:4000` merespons HTTP 200.

Baca dokumentasi dari:
- `docs/project.md`
- `docs/konteks.md`
- `docs/SETUP-EMULATOR.md`

## Cara menjalankan tes Auth + Admin
1. Pastikan Java 17+ terpasang (`java -version`).
2. Terminal 1: `npm run emulators` → UI di `http://127.0.0.1:4000`
3. Terminal 2: `npm run dev` → `http://localhost:3000/login`
4. Daftar di `/register` (role default `pegawai`) atau login Google lewat popup emulator (bukan Google sungguhan).
5. Super Admin pertama: di Emulator UI → Firestore → `users/{uid}` → ubah `role` jadi `super_admin` → logout/login.
6. Role `super_admin` / `admin` diarahkan ke `/admin`. Role lain yang membuka `/admin` di-redirect ke `/dashboard`.

## Perbaikan koneksi emulator
- Kalau env client kosong tetapi `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`, SDK memakai fallback `demo-tna-kompetensi` (sebelumnya `isFirebaseConfigured()` false sehingga login disabled).
- `client.ts` tetap menyambung Auth `127.0.0.1:9099` dan Firestore `127.0.0.1:8080` di browser, dengan try/catch untuk hot reload.
- Script: `npm run emulators` = Auth + Firestore + UI, `--project demo-tna-kompetensi`.
- `npm run emulators:all` jangan dipakai sampai folder `functions/` ada.

## Auth & Role — file terkait
```
src/lib/firebase/env.ts      # fallback config emulator
src/lib/firebase/client.ts   # connectAuthEmulator + connectFirestoreEmulator
.env.local.example
.env.local                   # tidak di-commit
docs/SETUP-EMULATOR.md
```

Alur Auth tidak berubah: login → `ensureUserProfile()` → `users/{uid}` role `pegawai` → redirect `/dashboard` atau `/admin`.

## Admin Panel + Master Data + TNA — file terkait
```
src/app/(admin)/layout.tsx                 # AuthGate area="admin"
src/app/(admin)/admin/layout.tsx           # AdminShell (sidebar + header)
src/app/(admin)/admin/page.tsx             # Dashboard admin
src/app/(admin)/admin/unit-kerja/**
src/app/(admin)/admin/jabatan/**
src/app/(admin)/admin/pangkat/**
src/app/(admin)/admin/tusi/**
src/app/(admin)/admin/level-kompetensi/**
src/app/(admin)/admin/kompetensi/**
src/app/(admin)/admin/soal/**
src/app/(admin)/admin/periode/**
src/app/(admin)/admin/pengguna/**
src/app/(admin)/admin/tna/page.tsx         # Daftar rekap TNA per periode
src/app/(admin)/admin/tna/[periodeId]/page.tsx # Detail rekap TNA pegawai + usulan diklat
src/app/(dashboard)/dashboard/penilaian/**
src/app/(dashboard)/dashboard/penilaian-atasan/**
src/components/admin/admin-shell.tsx
src/components/admin/nav.ts
src/components/admin/periode-form.tsx
src/components/admin/pengguna-form.tsx
src/components/dashboard/dashboard-shell.tsx
src/components/dashboard/nav.ts
src/components/dashboard/self-assessment-form.tsx
src/components/dashboard/supervisor-assessment-form.tsx
src/components/admin/unit-kerja-form.tsx
src/components/admin/jabatan-form.tsx
src/components/admin/pangkat-form.tsx
src/components/admin/tusi-form.tsx
src/components/admin/kompetensi-level-form.tsx
src/components/admin/kompetensi-form.tsx
src/components/admin/question-form.tsx
src/lib/services/unit-kerja.ts
src/lib/services/jabatan.ts
src/lib/services/pangkat.ts
src/lib/services/tusi.ts
src/lib/services/kompetensi-level.ts
src/lib/services/kompetensi.ts
src/lib/services/question.ts
src/lib/services/assessment-period.ts
src/lib/services/self-assessment.ts
src/lib/services/supervisor-assessment.ts
src/lib/services/pengguna.ts
src/lib/services/tna.ts
src/lib/auth/user-profile.ts
src/hooks/use-unit-kerja.ts
src/hooks/use-jabatan.ts
src/hooks/use-pangkat.ts
src/hooks/use-tusi.ts
src/hooks/use-kompetensi-level.ts
src/hooks/use-kompetensi.ts
src/hooks/use-question.ts
src/hooks/use-assessment-period.ts
src/hooks/use-pengguna.ts
src/hooks/use-subordinates.ts
src/hooks/use-tna.ts
```

Route:
- `/admin` — dashboard + ringkasan master data & Rekap TNA
- `/admin/unit-kerja` — daftar hierarkis (indent per level)
- `/admin/unit-kerja/baru?parentId=` — tambah (opsional pra-pilih induk)
- `/admin/unit-kerja/[id]` — edit
- `/admin/jabatan`, `/admin/jabatan/baru`, `/admin/jabatan/[id]`
- `/admin/pangkat`, `/admin/pangkat/baru`, `/admin/pangkat/[id]`
- `/admin/tusi`, `/admin/tusi/baru?unitKerjaId=`, `/admin/tusi/[id]`
- `/admin/level-kompetensi`, `/admin/level-kompetensi/baru`, `/admin/level-kompetensi/[id]`
- `/admin/kompetensi`, `/admin/kompetensi/baru`, `/admin/kompetensi/[id]`
- `/admin/soal`, `/admin/soal/baru?kompetensiId=&tusiId=`, `/admin/soal/[id]`
- `/admin/periode`, `/admin/periode/baru`, `/admin/periode/[id]`
- `/admin/pengguna`, `/admin/pengguna/[id]`
- `/admin/tna` — daftar ringkasan Rekap TNA per periode + tombol generate/perbarui
- `/admin/tna/[periodeId]` — detail evaluasi pegawai, skor 3 dimensi, rekomendasi atasan, filter unit & status, modal detail
- `/dashboard` — beranda pegawai
- `/dashboard/penilaian` — daftar periode
- `/dashboard/penilaian/[periodeId]` — isi / lihat self assessment
- `/dashboard/penilaian-atasan` — daftar bawahan yang punya self assessment di periode aktif
- `/dashboard/penilaian-atasan/[employeeId]` — form penilaian atasan

Akses: hanya `super_admin` dan `admin`. Proteksi berlapis:
1. Middleware cookie role (`/admin` → `/dashboard` jika bukan admin)
2. `AuthGate` `area="admin"` (`canAccessAdmin`)
3. Firestore rules: master data + `assessment_periods` + `tna_recaps` + `training_proposals` write hanya `isAdmin()`. Update `users.role` hanya `super_admin`. Admin boleh mengubah penempatan/atasan/TUSI tanpa menyentuh `role`. Pegawai boleh create/update `assessments` milik sendiri (`type: self`) dan `assessment_answers`. Atasan boleh membaca user bawahan (`supervisorId == uid`), membaca self assessment bawahan, serta create/update penilaian atasan (`type: supervisor`, `assessorId == uid`).

## Standar Kompetensi & Gap per Kompetensi — file terkait
```
src/app/(admin)/admin/standar-kompetensi/page.tsx  # satu halaman: pilih jabatan -> tabel kompetensi -> dropdown level 1-5 -> simpan sekaligus
src/lib/services/standar-kompetensi.ts             # get/save standar_kompetensi/{jabatanId}
src/hooks/use-standar-kompetensi.ts
src/lib/services/competency-score.ts               # computeEmployeeCompetencyScores(periodId, employee) -> CompetencyScore[]
src/types/competency.ts                             # StandarKompetensi + StandarKompetensiItem (didefinisikan ulang)
src/types/assessment.ts                             # CompetencyScore + field butuhPelatihan (baru)
src/lib/services/tna.ts                             # generateTnaRecap() sekarang memanggil computeEmployeeCompetencyScores per pegawai
src/components/admin/nav.ts                         # entri "Standar Kompetensi" di grup Master Data
```

Route baru: `/admin/standar-kompetensi` — akses sama seperti master data lain (`isAdmin()`).

Ringkasan alur:
- **Struktur dokumen** `standar_kompetensi/{jabatanId}`: `{ id, jabatanId, items: [{kompetensiId, levelStandar(1-5)}], updatedAt, updatedBy }`. Satu dokumen per jabatan, ID dokumen = `jabatanId` langsung (bukan auto-ID). Rule Firestore untuk collection ini **sudah ada sebelumnya** (baca signed-in, tulis admin) dan tidak perlu diubah.
- **Verifikasi skala (blocking check sebelum implementasi)**: dikonfirmasi bahwa jawaban soal `likert` pada self assessment dan `dimensionScores` penilaian atasan sama-sama memakai skala `KompetensiLevel` global (default 1-5, 5 = paling mampu) — aman dijumlahkan. Tapi soal `yes_no` memakai skala terpisah `0/1` (`YES_NO_OPTIONS`) yang TIDAK sebanding, dan tidak ada validasi yang mencegah soal `yes_no` dikaitkan ke `kompetensiId`. Keputusan: `computeEmployeeCompetencyScores()` hanya menghitung jawaban yang `AssessmentAnswer.value`-nya bertipe `number` (ciri khas jawaban likert dalam kode saat ini) — bukan dengan join balik ke collection `questions`, cukup dari field yang sudah ada di `assessment_answers`. Jawaban `yes_no`/lainnya tetap tersimpan seperti biasa, hanya tidak ikut dihitung.
- **Mesin skor** (`competency-score.ts`): untuk satu pegawai + periode, group jawaban likert per `kompetensiId` -> `selfScore` (rata-rata). `supervisorScore` diambil dari `dimensionScores[kompetensi.dimensi]` milik penilaian atasan (bukan rata-rata jawaban — penilaian atasan tidak punya `assessment_answers` per kompetensi, hanya 3 skor dimensi). `actualLevel` = `supervisorScore*0.7 + selfScore*0.3` (konstanta `SUPERVISOR_SCORE_WEIGHT`/`SELF_SCORE_WEIGHT`), atau `selfScore` saja jika penilaian atasan belum ada. `requiredLevel` diambil dari `standar_kompetensi` jabatan pegawai; kompetensi yang tidak ada jawaban likert ATAU tidak ada di standar **dilewati total** dari hasil (tidak dikembalikan dengan nilai 0/null). `gap = requiredLevel - actualLevel`. `butuhPelatihan = gap >= 1.0` (konstanta `GAP_TRAINING_THRESHOLD`, ditambahkan sebagai field baru ke type `CompetencyScore` yang sudah ada, bukan wrapper type baru). Dihitung on-demand, tidak disimpan ke collection baru.
- **`tna.ts` (`generateTnaRecap`)**: `averageGap` per unit kerja sekarang dihitung dari rata-rata `gap` seluruh (pegawai × kompetensi) hasil `computeEmployeeCompetencyScores()` pada unit tsb, bukan lagi `5.0 - overallScore`. Signature fungsi tidak berubah. Clamp lama (`if (averageGap < 0) averageGap = 0`) dihapus karena gap negatif sekarang bermakna nyata (pegawai melebihi standar), bukan sekadar noise perhitungan.

## Kontrol Akses & Parameter Sistem — file terkait
```
src/types/user.ts                              # UserStatus, UserInvitation, UserProfile.status
src/types/parameter.ts                         # SystemParameters (satu dokumen global, ganti bentuk key/value lama)
src/lib/auth/user-profile.ts                   # buildDefaultProfile (pending) vs buildInvitedProfile (aktif)
src/lib/auth/session.ts                        # ensureUserProfile: gerbang domain+mode+undangan, rollback akun Auth kalau ditolak
src/lib/auth/guards.ts                         # requireAuthenticated/requireGuest sadar status; area "pending" baru
src/lib/auth/constants.ts                      # PENDING_PATH = "/pending"
src/components/auth/auth-gate.tsx              # sign-out kalau status nonaktif (sama seperti !isActive)
src/lib/services/system-parameter.ts           # get/save system_parameters/global
src/hooks/use-system-parameter.ts
src/lib/services/user-invitation.ts            # createInvitation, getInvitationByEmail, markInvitationUsedInBatch
src/hooks/use-user-invitation.ts
src/lib/services/pengguna.ts                   # +listPendingUsers, approveUser, rejectUser
src/hooks/use-pengguna.ts                      # +usePendingUserList
src/app/pending/layout.tsx + page.tsx          # halaman tunggu, tanpa Shell/menu
src/app/(admin)/admin/persetujuan-akun/page.tsx # form undang + tabel pending + approve/reject
src/app/(admin)/admin/parameter/page.tsx       # form parameter sistem
src/components/admin/nav.ts                    # +Persetujuan Akun (badge jumlah pending) +Parameter Sistem
src/components/admin/admin-shell.tsx           # hitung badge dari usePendingUserList()
scripts/seed-dev.ts                            # +system_parameters/global, status:"aktif" di 4 user seed
firestore.rules                                # lihat ringkasan di bawah
```

Route baru: `/pending` (area khusus, bukan dashboard/admin), `/admin/persetujuan-akun`, `/admin/parameter`.

Ringkasan alur:
- **`UserProfile.status`**: `"pending" | "aktif" | "nonaktif"`. Data lama tanpa field ini dibaca sebagai `"aktif"` di `mapUserProfile` (biar tidak mengunci akun lama) — **tapi firestore.rules TIDAK punya fallback itu**, `userExists()` di rules mensyaratkan `userData().status == 'aktif'` persis. Kalau ada user tanpa field `status` di Firestore, hak admin mereka hilang di level rules sampai field-nya diisi. Tidak masalah untuk project ini (belum ada data produksi), tapi wajib diingat.
- **Dua mode pendaftaran** (`system_parameters/global.modePendaftaran`): "terbuka" → siapa saja boleh bikin akun sendiri, status otomatis `pending`, role dipaksa `pegawai`. "tertutup" → hanya email yang sudah diundang admin (`user_invitations/{emailLowercase}`, `usedAt == null`) yang boleh mendaftar; kalau valid, status LANGSUNG `aktif` dan role/unit/jabatan/atasan mengikuti data undangan (bukan `pending` — sudah dianggap disetujui saat diundang). Domain email (`domainDiizinkan`) dicek di kedua mode, sebelum cek mode.
- **Gerbang pendaftaran ada satu tempat**: `ensureUserProfile()` di `session.ts`, dipanggil baik dari `registerWithEmail` maupun `signInWithGoogle`/`signInWithEmail` (pertama kali) — jadi mode tertutup tidak bisa dilewati dengan pakai tombol "Masuk dengan Google". Kalau gerbang menolak (domain/undangan), akun Firebase Auth yang baru saja terbentuk **di-rollback** (`deleteUser`) supaya email tidak nyangkut permanen tanpa profil.
- **`user_invitations/{emailLowercase}`**: TIDAK dihapus setelah dipakai (sesuai instruksi) — `usedAt` diisi timestamp sebagai penanda. Field: `email, namaLengkap, unitKerjaId, jabatanId, supervisorId, role, createdAt, createdBy, usedAt`. Dibuat dari `/admin/persetujuan-akun` (form "Undang Pengguna Baru").
- **Firestore rules, perubahan**:
  - `userExists()` (dipakai `hasRole`/`isAdmin`/`isSuperAdmin`/`isModerator` — jadi berlaku ke SEMUA collection) sekarang juga mensyaratkan `status == 'aktif'`. Admin/moderator yang dinonaktifkan langsung kehilangan hak tulis di rules, bukan cuma diblokir UI.
  - `users` create: dua jalur — (a) `role=='pegawai' && status=='pending'` (pendaftaran mandiri biasa), atau (b) `status=='aktif'` DAN ada undangan valid di `user_invitations` dengan `role` yang sama persis (`hasUsableInvitation`). Email di payload wajib sama dengan `request.auth.token.email` (dicocokkan huruf kecil) — mencegah orang memakai undangan milik email lain.
  - `users` update: field `status` ditambahkan ke daftar yang **tidak boleh** diubah sendiri oleh pemilik akun (`isOwner`) — tanpa ini, user `pending` bisa curang set status dirinya sendiri jadi `aktif` lewat write langsung.
  - `user_invitations`: baca/tulis umum hanya admin. **Pengecualian sempit**: pemilik email (dicocokkan `request.auth.token.email`) boleh membaca undangannya sendiri (perlu saat proses daftar, sebelum jadi admin apa pun) dan boleh meng-update **hanya field `usedAt`** dari `null` ke terisi (bagian dari alur pendaftaran yang tidak lewat Cloud Functions). Ini penyesuaian dari instruksi asli "hanya admin" — kalau benar-benar hanya admin, alur pendaftaran mandiri tidak akan pernah bisa menandai undangan terpakai sendiri.
  - `system_parameters` write: dari `isAdmin()` jadi `isSuperAdmin()` saja (sebelumnya admin biasa juga bisa tulis).
- **Diuji nyata** (bukan cuma `tsc`/lint): skrip sekali-pakai lewat `tsx` memanggil `registerWithEmail()` langsung ke emulator — daftar tanpa undangan ditolak dengan pesan jelas + akun Auth ter-rollback; daftar dengan undangan valid berhasil (status `aktif`, role sesuai undangan) dan `usedAt` undangan terisi. Skrip dihapus setelah dipakai, tidak masuk repo.
- **Badge jumlah pending** di sidebar admin dihitung dari `usePendingUserList()` di `AdminShell`, ditempel ke item nav lewat `badgeKey: "pendingUsers"` (lihat `AdminNavLink`).

### Utang teknis: A5 (session cookie httpOnly) — TIDAK dikerjakan
Diminta secara eksplisit untuk verifikasi dulu sebelum eksekusi; jawabannya **tidak bisa tanpa merombak alur auth secara besar**, jadi dilewati. Dicatat sebagai utang teknis:

> Middleware belum memverifikasi session cookie secara kriptografis. Perlu Node runtime middleware + custom claims. Dampak terbatas karena guards.ts dan firestore.rules sama-sama mengecek status dari Firestore.

Detail alasan: `src/middleware.ts` jalan di Edge Runtime (default Next.js), sedangkan `firebase-admin`/`verifySessionCookie` butuh Node.js runtime (perlu opt-in eksperimental `nodeMiddleware` di `next.config.ts`). Bahkan kalau itu diaktifkan, role & status pengguna hidup di Firestore, bukan custom claims Firebase Auth — verifikasi di middleware tanpa query Firestore per-request butuh sinkronisasi custom claims baru (`setCustomUserClaims` tiap role/status berubah + refresh token client). `middleware.ts` **tidak disentuh** di tugas ini.

## Keputusan penting
2. Nilai `apiKey` / `appId` dummy boleh dipakai selama flag emulator `true`.
3. Host emulator memakai `127.0.0.1`, bukan `localhost` (hindari masalah IPv6 di Windows).
4. Cookie session tetap UX-only; sumber kebenaran role = Firestore.
5. **Level Unit Kerja 1-based**: root = 1, anak = induk + 1. Field `level` di form read-only (dihitung dari `parentId`).
6. Field Unit Kerja: `name`, `code`, `parentId`, `level`, `path`, `sortOrder`, `isActive`, audit.
7. `path` memakai ID dokumen (`/parentId/childId`) supaya stabil saat kode berubah.
8. `code` Unit Kerja dan Jabatan dinormalisasi uppercase, unik di koleksinya.
9. Tidak ada hard-delete. Status dikontrol lewat aktif/nonaktif.
10. Pola CRUD Unit Kerja jadi acuan Jabatan dan Pangkat.
11. **Link yang terlihat seperti tombol** memakai `buttonVariants()` pada `<Link>`, bukan `<Button render={<Link />} />`.
12. **`DropdownMenuLabel` harus di dalam `DropdownMenuGroup`**.
13. **Jabatan** field form: `name`, `code`, `eselon` (opsional I–V), `isActive`. Relasi `unitKerjaId` / `tusiIds` / `description` disimpan default (`null` / `[]`) dan **belum** diekspos di UI.
14. **Pangkat** field form: `name`, `golongan` (contoh `III/a`), `sortOrder` (urutan), `isActive`. Nama dan golongan unik. Golongan dinormalisasi jadi `III/a`.
15. Sidebar Master Data urutan: Unit Kerja → Jabatan → Pangkat / Golongan → TUSI → Level Kompetensi → Kompetensi → Bank Soal.
16. **TUSI** field form: `name` (judul), `code` (opsional, unik jika diisi), `unitKerjaId` (wajib), `jabatanId` (opsional), `description`, `isActive`. Nama unik per unit kerja. `kompetensiIds` disimpan `[]` dan belum diekspos. Relasi ke User / Bank Soal belum dibuat.
17. **Level Kompetensi** adalah skala global (`kompetensi_levels` dengan `kompetensiId: null`). Field: `name`, `code` (opsional), `level` (nilai/urutan unik), `description`, `isActive`. Seed default 5 level (STM 1 … SM 5) lewat tombol jika koleksi kosong. Urutan bisa diubah naik/turun (tukar nilai).
18. **Kompetensi** field form: `name`, `code` (opsional), `dimensi` (`pengetahuan` / `keterampilan` / `sikap_perilaku`), `description`, `levelIds` (opsional; kosong = semua level aktif), `isActive`. `category` disimpan default `lainnya` dan belum diekspos. Relasi ke jabatan (`standar_kompetensi`) belum dibuat.
19. **Bank Soal** field form: `text`, `code` (opsional), `type` (`likert` / `multiple_choice` / `yes_no`; default dan prioritas `likert`), `kompetensiId` (opsional), `tusiId` (opsional), `dimensi` (otomatis dari kompetensi, bisa diubah), `sortOrder`, `isActive`. Skala likert memakai min/max dari level aktif (fallback 1–5). Ya/Tidak menyimpan opsi tetap. Pilihan ganda belum punya editor opsi. Penyusunan kuesioner belum dibuat.
20. **Periode Penilaian** (`assessment_periods`): `name`, `year`, `startsAt`, `endsAt` (tanggal `YYYY-MM-DD`), `status` (`draft` / `active` / `closed` = selesai). Nama unik per tahun. **Hanya satu periode `active`**. Mengaktifkan satu periode mengembalikan periode aktif lain ke `draft`. Pegawai hanya bisa mengisi jika `active` dan hari ini di antara tanggal mulai–selesai.
21. **Self Assessment**: ID deterministik `self_{periodId}_{uid}`. Jawaban ID `{assessmentId}_{questionId}`. Soal dipilih fleksibel: (1) soal `tusiId` ∈ `user.tusiIds`, (2) jika < 5 soal, ditambah soal kompetensi yang tercatat di TUSI user (`tusi.kompetensiIds`), (3) lalu soal umum (tanpa TUSI/kompetensi), (4) jika tetap kosong, semua soal aktif. Soal yang sudah dijawab tetap ditampilkan saat form dibuka lagi. Jawaban disimpan per soal. Kirim mengunci assessment (`submitted`). Form menampilkan periode, unit kerja, TUSI, dan jumlah soal.
22. **Pengguna** (`users`): admin melihat daftar + edit penempatan. Field diubah: `role` (hanya Super Admin), `unitKerjaId`, `jabatanId`, `pangkatId`, `supervisorId`, `tusiIds`. Nama/email read-only. Atasan dicegah siklus (tidak boleh diri sendiri atau bawahan). Super Admin terakhir tidak boleh diturunkan. `tusiIds` ditambahkan ke `UserProfile` (sebelumnya hanya ada di snapshot assessment).
23. **Penilaian Atasan**: satu dokumen `assessments` terpisah, ID deterministik `sup_{periodId}_{employeeId}_{supervisorId}`. Daftar `/dashboard/penilaian-atasan` menampilkan bawahan yang sudah punya self assessment di periode aktif. Form menampilkan self assessment read-only, lalu 3 skor dimensi (Pengetahuan / Keterampilan / Sikap Perilaku) memakai Level Kompetensi global, plus textarea rekomendasi usulan pelatihan (free text). Tombol Simpan draft dan Kirim. Setelah dikirim, dokumen terkunci. `overallScore` = rata-rata 3 dimensi (1 desimal). Menu sidebar "Penilaian Atasan" hanya muncul jika `listSubordinates(uid)` tidak kosong.
24. **Rekap TNA & Usulan Pelatihan**: 
    - Generate Rekap TNA dilakukan **secara manual oleh Admin** (tombol "Generate / Perbarui" di `/admin/tna` dan `/admin/tna/[periodeId]`), bukan otomatis background job.
    - Usulan pelatihan dari atasan bersifat **free text** yang disimpan pada `training_proposals` (`id: prop_{periodId}_{employeeId}`) saat tombol generate ditekan.
    - Rekapitulasi per unit kerja diagregasi ke koleksi `tna_recaps` (`id: recap_{periodId}_{unitId}`) dengan menghitung gap rata-rata terhadap target skala 5.0 dan merangkum daftar rekomendasi pelatihan unit kerja terkait.
    - Halaman detail `/admin/tna/[periodeId]` menyajikan daftar lengkap pegawai, filter unit kerja, filter status (Lengkap, Belum Self, Belum Atasan, Ada Usulan), skor dimensi 3 pilar, ringkasan rekomendasi atasan, dan dialog detail per pegawai.
25. **Auto-Create Draft Self Assessment & Otentikasi**:
    - Perbaikan `firestore.rules` pada koleksi `/assessments/{id}` dengan menambahkan pengecekan `resource == null` agar pemanggilan `getDoc` pada dokumen yang belum dibuat tidak memicu evaluasi properti `resource.data` (yang sebelumnya menghasilkan error `permission-denied`).
    - Fungsi `getOrCreateSelfAssessment(period, profile)` secara otomatis membuat dokumen draft (`status: draft`, `type: self`, `employeeId: uid`, `assessorId: uid`) saat pegawai pertama kali menekan 'Isi Penilaian' pada periode aktif, menyematkan snapshot penempatan/TUSI, dan langsung menampilkan kuesioner berbasis TUSI yang diampu.
    - Menambahkan alias rute `/assessment/:periodeId*` dan `/self-assessment/:periodeId*` yang me-redirect otomatis ke `/dashboard/penilaian/:periodeId*`.

## Yang belum dikerjakan
- Klik login/register/admin di browser pada sesi ini (emulator + UI belum diklik end-to-end untuk Jabatan/Pangkat)
- Session cookie httpOnly + verifikasi kriptografis di middleware — lihat "Utang teknis: A5" di atas
- Scaffold Cloud Functions
- Relasi Jabatan ↔ Unit Kerja (selain lewat data user)
- Relasi TUSI ↔ Kompetensi (selain lewat soal)
- Penilaian atasan per soal / per kompetensi (saat ini 3 dimensi; skor per kompetensi didapat lewat pemetaan `dimensi`, bukan input langsung per kompetensi)
- Soal `multiple_choice` masih belum punya editor opsi (independen dari pekerjaan Standar Kompetensi/gap)
- Fitur Export Rekap TNA ke format Excel / PDF (opsional untuk pengembangan berikutnya)
- `computeEmployeeCompetencyScores()` masih pakai konstanta bawaan (`SUPERVISOR_SCORE_WEIGHT`/`SELF_SCORE_WEIGHT`/`GAP_TRAINING_THRESHOLD`), BELUM menerima `bobotAtasan`/`bobotSelf`/`ambangButuhPelatihan` dari `system_parameters/global` sebagai argumen. Prinsip wajib kalau nanti dikerjakan: baca parameter SATU KALI di level halaman/hook lalu OPER sebagai argumen ke fungsi — `competency-score.ts` sendiri jangan baca Firestore. `skalaMaksimum`/`labelSkala` juga belum dipakai di UI mana pun (form self/supervisor assessment masih hardcode skala 1-5 lewat `kompetensi_levels`, bukan dari parameter ini).
- Halaman Parameter Sistem (`/admin/parameter`) dan Persetujuan Akun (`/admin/persetujuan-akun`) belum diklik manual di browser — baru diverifikasi lewat `tsc`, lint, dan skrip smoke test langsung ke `registerWithEmail()` (bukan lewat form React-nya).

## Catatan / masalah
- Firestore Emulator **wajib Java**. Tanpa Java, `npm run emulators` gagal.
- Persistensi data emulator sudah aktif (`--import=./emulator-data --export-on-exit=./emulator-data`).
- Warning Node `v20.18.2` vs `eslint-visitor-keys` tetap ada.
- Service master data client-side (`getClientDb`). Jangan dipanggil dari Server Component tanpa koneksi emulator server.
- Console error Base UI Button (`nativeButton` vs `<Link>`) sudah diperbaiki.
- Console error Base UI `MenuGroupContext is missing` sudah diperbaiki di menu user `AdminShell`.

## Catatan untuk AI Agent Berikutnya
- Selalu baca `docs/project.md`, `docs/konteks.md`, dan `docs/SETUP-EMULATOR.md`.
- Modul Rekap TNA (`/admin/tna` dan `/admin/tna/[periodeId]`) sudah selesai dan siap diuji di emulator bersama alur Self Assessment dan Penilaian Atasan.
- Modul Standar Kompetensi (`/admin/standar-kompetensi`) dan mesin skor per kompetensi (`src/lib/services/competency-score.ts`) sudah selesai; `generateTnaRecap()` di `tna.ts` sudah memakainya.
- Kontrol akses (status akun, undangan, parameter sistem) sudah selesai dan sudah diuji lewat emulator (lihat bagian "Kontrol Akses & Parameter Sistem"). `middleware.ts` **sengaja tidak disentuh** — jangan diubah tanpa diskusi ulang soal A5.
- `emulator-data/` sempat dikosongkan lalu di-seed ulang (`npm run seed:dev`) untuk menguji rules baru dari kondisi bersih — kalau ada yang terasa hilang dari data emulator sebelumnya, itu sebabnya.
- Jangan mengubah arsitektur besar tanpa persetujuan.
- Setiap selesai tahap, update file ini.
