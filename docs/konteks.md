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
- **Soal pilihan ganda + Tes Pengetahuan (opsional) + kolom Validasi Tes di Rekap TNA sudah ada.** Lihat bagian "Tes Pengetahuan & Validasi Tes" di bawah. `bobotAtasan`/`bobotSelf`/`ambangButuhPelatihan` sekarang benar-benar dioper dari `system_parameters/global` ke `computeEmployeeCompetencyScores()` (sebelumnya cuma konstanta hardcode — item ini sudah dihapus dari daftar "belum dikerjakan").
- **Pipeline impor Bank Soal berbantuan AI sudah ada** (`/admin/soal/import`): rakit prompt → tempel JSON dari AI mana pun → validasi ketat → pratinjau → simpan (semua-atau-tidak-sama-sekali). Lihat bagian "Impor Soal Berbantuan AI" di bawah.
- **Aksi "Segarkan Kunci Jawaban ke Periode Aktif" sudah ada** di `/admin/soal` (Super Admin) + peringatan otomatis kalau ada kunci yang masih menunjuk periode lama. **PROSEDUR OPERASIONAL WAJIB** — lihat bagian "Segarkan Kunci Jawaban (prosedur wajib per periode baru)" di bawah.
- **Tong Sampah Soal sudah ada** (`/admin/soal/tong-sampah`): Buang/Pulihkan/Hapus Permanen (massal + satu-satu), hapus permanen dijaga rules (`isSuperAdmin()`, baru) + verifikasi ulang "belum pernah dijawab" di kode. Peringatan "soal yatim" (pilihan ganda aktif tanpa kunci jawaban) juga ditambahkan di `/admin/soal`. Lihat bagian "Tong Sampah Soal" di bawah.
- **Halaman `/bantuan` sudah ada** (semua pengguna login, isi disesuaikan role) dan **logo + nama instansi bisa ditampilkan di header aplikasi** lewat `system_parameters/global.logoUrl`. Lihat bagian "Bantuan, Logo & Tentang" di bawah.
- **Aplikasi sudah LIVE di produksi** (Vercel: `kompetensi-chi.vercel.app`, Firestore project: `tna-blk-kesehatan`). `.env.example` dibuat berisi semua env var (kosong) — lihat `src/lib/firebase/env.ts` untuk daftar pastinya. Admin SDK (`admin.ts`) TIDAK dipakai app yang di-deploy (tidak diimpor dari `src/app` mana pun, tidak ada API route) — hanya untuk `scripts/*.ts` lokal.
- **Insiden produksi ditemukan & diperbaiki**: pendaftaran mode "tertutup" gagal total (rollback akun Auth) kalau dokumen `user_invitations` dibuat manual lewat Firestore Console tanpa field `usedAt` — `firestore.rules` memakai `.data.usedAt == null` yang error (bukan `null`) kalau field itu TIDAK ADA. Diperbaiki jadi `.data.get('usedAt', null) == null` di semua tempat serupa. Lihat bagian "Insiden Produksi: usedAt Hilang" di bawah — **WAJIB DEPLOY ke produksi**, belum otomatis lewat commit ini.
- **Lupa Kata Sandi sudah ada** (`/lupa-password`, ditautkan dari `/login`) — `sendPasswordResetEmail`, pesan sukses SAMA persis baik email terdaftar atau tidak (anti-enumerasi), catatan untuk pengguna Google. Lihat bagian "Lupa Password & Verifikasi Email" di bawah.
- **Verifikasi Email untuk akun email/password sudah ada (lengkap, termasuk rules)** — `/verifikasi-email`, gerbang baru `GuardArea "verify-email"`, PLUS `userExists()` di `firestore.rules` sekarang mensyaratkan `request.auth.token.email_verified == true` (di-deploy setelah dikonfirmasi empiris tidak mengunci akun Google). Akun Google TIDAK terdampak (dibuktikan lewat sign-in Google sungguhan di emulator via fake-IdP, bukan asumsi — lihat bagian "Lupa Password & Verifikasi Email").
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

## Tes Pengetahuan & Validasi Tes — file terkait
```
src/types/test.ts                              # QuestionAnswerKey, TestSessionAnswer/CompetencyScore/Status/TestSession
src/types/index.ts                              # re-export 5 tipe di atas
src/lib/firebase/collections.ts                 # +questionAnswerKeys, +testSessions
src/lib/services/question-answer-key.ts         # get/save/delete question_answer_keys/{questionId} (lewat writeBatch)
src/lib/services/question.ts                    # +MultipleChoiceOptionInput, resolveOptions() utk multiple_choice (score selalu null), applyAnswerKey() di createQuestion/updateQuestion (writeBatch)
src/lib/services/test-session.ts                # submitTestSession() = alur 2 fase (lihat di bawah), getTestSession, listTestSessionsForPeriod
src/hooks/use-test-session.ts                   # useTestSession, useTestSessionsForPeriod
src/components/admin/question-form.tsx          # editor opsi pilihan ganda (tambah/hapus opsi, radio jawaban benar) di /admin/soal
src/app/(dashboard)/dashboard/tes-pengetahuan/page.tsx  # halaman tes, opsional, satu kali per periode
src/components/dashboard/nav.ts                 # +menu "Tes Pengetahuan"
src/lib/services/competency-score.ts            # +CompetencyScoreWeights (parameter, BUKAN baca Firestore sendiri) — lihat di bawah
src/hooks/use-competency-score.ts               # useEmployeeCompetencyScores() terima weights? opsional, WAJIB di-memoize pemanggil
src/lib/services/tna.ts                         # generateTnaRecap() ambil system_parameters SATU KALI lalu oper weights ke tiap panggilan computeEmployeeCompetencyScores()
src/app/(admin)/admin/tna/[periodeId]/page.tsx  # kolom "Validasi Tes" (informasi = hanya dialog detail; integrasi = juga di tabel rekap utama)
scripts/seed-dev.ts                             # +12 soal multiple_choice, +question_answer_keys, +1 test_sessions (Pegawai B)
firestore.rules                                 # lihat ringkasan di bawah
```

Route baru: `/dashboard/tes-pengetahuan`. Kolom baru (bukan route baru) di `/admin/tna/[periodeId]`.

### Ringkasan alur
- **Soal pilihan ganda**: `/admin/soal` sekarang punya editor opsi (min 2 opsi, radio memilih satu jawaban benar, validasi sebelum simpan). Berbeda dari `likert`/`yes_no`, field `options[].score` untuk `multiple_choice` **selalu `null`** — kebenaran jawaban TIDAK disimpan di `questions` (collection ini terbuka dibaca semua pengguna sign-in) melainkan di collection terpisah `question_answer_keys/{questionId}` yang tertutup. `createQuestion`/`updateQuestion` sekarang memakai `writeBatch` supaya soal + kunci jawabannya tersimpan atomik.
- **Kenapa kunci jawaban dipisah, dan kenapa TIDAK memakai `test_unlock` per-uid**: Rencana awal memakai satu dokumen `test_unlock/{uid}` untuk membuka akses baca kunci jawaban. Ditolak: dengan gerbang per-uid, begitu seorang pegawai pernah membuka kuncinya, ia (dan siapa pun yang query dokumen itu) tetap bisa membaca kunci itu selamanya — termasuk di periode/tahun berikutnya, membuat tes tahun kedua percuma untuk peserta lama. Solusi yang dipakai: `question_answer_keys/{questionId}` menyimpan `periodeId` (periode aktif saat soal terakhir disimpan admin), dan rule mencocokkannya terhadap `test_sessions/{uid}_{periodeId}` milik pembaca — ID dokumen deterministik, jadi rule bisa `exists()`/`get()` langsung tanpa query. Gerbang jadi **per-periode**, bukan sekali-buka-selamanya.
- **Alur submit tes 2 fase** (`submitTestSession()` di `test-session.ts`), dirancang supaya kunci jawaban TIDAK PERNAH terkirim ke client sebelum tes selesai dikerjakan:
  1. Client kirim `test_sessions/{uid}_{periodeId}` (`create`) berisi jawaban mentah pegawai + `status: "submitted"` + `skorPerKompetensi: null`. Rule mengunci dokumen ini — field lain tidak bisa diubah lagi setelah ini (satu kali kerja, tidak bisa diulang).
  2. SETELAH create itu sukses, rule `question_answer_keys` baru mengizinkan baca (karena `test_sessions` milik pembaca untuk periode tsb kini `exists()` dengan `status == 'submitted'`) — baru di titik inilah client membaca kunci jawaban, per pertanyaan, dan menghitung `skorPerKompetensi` di sisi client.
  3. Client `update` field `skorPerKompetensi` (null → terisi) SATU KALI ke dokumen yang sama.
- **Skor tidak boleh dikarang client (proteksi Firestore rules)**: rule `test_sessions` pada `update` mensyaratkan transisi persis `skorPerKompetensi` dari `null` ke bukan-null, dan `diff().affectedKeys().hasOnly(['skorPerKompetensi','updatedAt'])` — field jawaban mentah (`answers`) sudah dikunci permanen sejak `create`, tidak bisa diubah lagi walau lewat DevTools. `question_answer_keys` sendiri hanya bisa ditulis admin.
- **Batas yang TIDAK bisa ditutup tanpa backend**: rule Firestore tidak bisa memverifikasi bahwa angka `skorPerKompetensi` yang ditulis client benar-benar hasil perhitungan jujur dari jawaban vs kunci (rules tidak bisa iterasi array + `get()` per elemen). Seorang pegawai yang paham DevTools masih *mungkin* menulis skor yang salah (walau tidak bisa membaca kunci sebelum submit, dan tidak bisa mengubah jawaban mentahnya). **Dicatat sebagai utang teknis, sama seperti A5**: penilaian sisi-server yang benar-benar tidak bisa dikarang butuh Cloud Functions atau Next.js route handler dengan Admin SDK (mis. `onDocumentCreated` trigger yang menghitung skor sendiri dari `answers` + kunci, lalu menulisnya — bukan client yang menulis skor). Sampai itu ada, integritas skor tes bergantung pada rules di atas + asumsi pegawai tidak berusaha memalsukan hasil tesnya sendiri.
- **`competency-score.ts` TIDAK diubah secara fungsional**: hasil tes pengetahuan **tidak pernah** masuk ke `skorTercapai`/`actualLevel`, `gap`, atau `butuhPelatihan` — perhitungan itu murni dari self assessment (likert) + penilaian atasan seperti sebelumnya. Filter likert yang sudah ada (`groupLikertScoresByKompetensi`, menolak jawaban selain `likert`) tidak disentuh. Satu-satunya perubahan: `bobotAtasan`/`bobotSelf`/`ambangButuhPelatihan` kini parameter opsional (`CompetencyScoreWeights`) dengan konstanta lama sebagai default — fungsi ini sendiri tetap tidak pernah membaca Firestore, pemanggil (`tna.ts`, halaman TNA detail) yang membaca `system_parameters/global` sekali lalu mengoper nilainya.
- **Kolom "Validasi Tes" di TNA**: `%` benar per kompetensi dari `test_sessions.skorPerKompetensi`, dibandingkan ke `ambangValidasiTes` (default 70) → badge **"Sesuai"/"Perlu Ditinjau"** (label lama "Valid"/"Tidak Valid" diganti di kedua tempat — badge ringkasan tabel utama & badge per kompetensi di dialog detail — supaya tidak terdengar seperti klaim resmi soal validitas kompetensi; makna/warna/threshold/angka persentase tidak berubah), atau "—" kalau pegawai belum mengerjakan tes. Mode `system_parameters.modeValidasiTes`: `"informasi"` → kolom ini hanya muncul di dialog detail per pegawai (`CompetencyGapSection`, per kompetensi); `"integrasi"` → kolom ringkasan (agregat semua kompetensi) JUGA muncul di tabel rekap utama. Kedua mode tidak pernah mengubah angka gap/skor yang sudah ada — murni kolom tambahan yang dibaca dari `test_sessions`, terpisah total dari `computeEmployeeCompetencyScores()`.
- **Seed data** (`scripts/seed-dev.ts`): 12 soal `multiple_choice` (2 per kompetensi) + `question_answer_keys` (jawaban benar selalu `opt1`), plus satu `test_sessions` Pegawai B yang sengaja dirancang: 5 kompetensi 100% benar, tapi **K6 (Sikap Integritas) 0% benar** — K6 kebetulan kompetensi dengan **gap PALING RENDAH** milik Pegawai B (0.30, `butuhPelatihan: false`). Ini demonstrasi sinyal paling berguna dari fitur ini: gap kecil dari self+atasan assessment tidak berarti pengetahuan dasarnya benar-benar memadai — kontras ini akan terlihat jelas di kolom Validasi Tes ("Tidak Valid" untuk K6, sementara "Butuh Pelatihan" versi lama tetap bilang "Tidak").
- **Diverifikasi ulang lewat emulator (bukan reimplementasi logika)**: skrip sekali-pakai memanggil `computeEmployeeCompetencyScores()` ASLI (bukan tulis ulang rumusnya) lewat client SDK yang disambungkan paksa ke emulator, sign-in `admin@seed.test`, ambil `weights` dari `system_parameters/global` sungguhan, lalu bandingkan tiap gap Pegawai B ke nilai yang diwajibkan. Hasil (lihat juga laporan di respons tugas ini): **K1 1.1 | K2 0.85 | K3 2.1 | K4 0.95 | K5 1 | K6 0.3 — SEMUA COCOK**, `butuhPelatihan` benar di ambang (K4 false meski tampil 1.0 setelah dibulatkan, K5 true tepat di ambang 1.0). Skrip verifikasi dihapus setelah dipakai, tidak masuk repo.
- **Uji keamanan gerbang kunci jawaban, dipisah dari uji di atas, memakai Firestore CLIENT SDK (bukan Admin SDK, yang melewati rules)** — sign-in bergantian sebagai `pegawai-a@seed.test`/`pegawai-b@seed.test`/`admin@seed.test` lewat emulator Auth sungguhan: (a) `pegawai-a` (belum punya `test_sessions` sama sekali) baca `question_answer_keys` → **ditolak `permission-denied`**; (b) `pegawai-b` (sudah submit tes periode aktif) baca kunci periode itu → **berhasil**; (c) `pegawai-b` (sesi sama) baca kunci milik periode dummy lain yang sengaja dibuat sebagai admin → **ditolak `permission-denied`**, membuktikan gerbangnya per-periode, bukan sekali-buka-selamanya; (d) `pegawai-b` coba `updateDoc` menimpa `skorPerKompetensi` pada `test_sessions` miliknya sendiri (yang sudah terisi dari seed) → **ditolak `permission-denied`**, membuktikan skor terkunci setelah ditulis sekali. Keempatnya lolos. Skrip + dokumen dummy dihapus setelah dipakai (dikonfirmasi lewat Admin SDK: dokumen dummy sudah tidak ada), tidak masuk repo.

## Impor Soal Berbantuan AI — file terkait
```
src/lib/services/question-import.ts          # parseImportPayload, validateImportRows, assemblePromptSoal (semua logika impor)
src/lib/services/question.ts                 # +buildQuestionWrite (internal, diekstrak dari createQuestion), +createQuestionsBatch (writeBatch tunggal untuk semua soal impor)
src/lib/services/system-parameter.ts         # +DEFAULT_TEMPLATE_PROMPT_SOAL, +PROMPT_SOAL_PLACEHOLDERS, validasi templatePromptSoal wajib memuat 5 placeholder
src/types/parameter.ts                       # SystemParameters +templatePromptSoal
src/app/(admin)/admin/parameter/page.tsx     # +section "Template Prompt Impor Soal (AI)" (textarea + tombol "Kembalikan ke Default")
src/app/(admin)/admin/soal/import/page.tsx   # halaman 3 langkah: rakit prompt -> tempel hasil -> pratinjau & simpan
src/app/(admin)/admin/soal/page.tsx          # +tombol "Impor via AI"
src/components/admin/nav.ts                  # +ADMIN_ROUTES.soalImport + page meta
scripts/seed-dev.ts                          # +templatePromptSoal (duplikat DEFAULT_TEMPLATE_PROMPT_SOAL, seed-dev.ts sengaja tidak impor modul client SDK)
```

Route baru: `/admin/soal/import`.

### Ringkasan alur
- **Skema JSON versioned** (`schemaVersion: "1.0"`): `{ schemaVersion, soal: [{ kompetensiKode, pertanyaan, tipe: "likert"|"yes_no"|"pilihan_ganda", opsi?: [{teks, benar}] }] }`. `opsi` hanya untuk `pilihan_ganda` (>=2, TEPAT SATU `benar:true`); `likert`/`yes_no` dilarang punya `opsi`.
- **Validasi 2 lapis, tanpa dependency baru** — `zod` sudah jadi dependency lama (dipakai `env.ts`), dipakai lagi di sini sesuai instruksi "pakai pustaka yang sudah ada": (1) zod memvalidasi BENTUK JSON (envelope `schemaVersion`+`soal`, tipe field tiap elemen) — gagal di sini = satu pesan error global yang menyebut baris & kolom bermasalah (dari `issue.path`), belum ada tabel pratinjau; (2) begitu bentuknya benar, `validateImportRows()` menjalankan aturan bisnis PER BARIS: `kompetensiKode` harus cocok ke `Kompetensi.code` (uppercase, sudah ada di DB), `tipe` harus salah satu dari 3 nilai yang dikenal, aturan opsi pilihan-ganda, dan yang terpenting **reuse `normalizeQuestionInput()`** yang sudah ada di `question.ts` (bukan re-implementasi) untuk validasi panjang teks/dimensi — satu sumber kebenaran dengan form manual `/admin/soal`. Duplikat dicek terhadap teks soal yang SUDAH ada di database DAN sesama baris di file yang sama (dinormalisasi trim+lowercase+spasi tunggal).
- **Toleran terhadap ```json fences`**: `stripCodeFence()` men-strip pembungkus ```` ```json ... ``` ```` sebelum `JSON.parse`.
- **Impor atomik sungguhan, bukan cuma "divalidasi dulu baru loop create"**: `createQuestion()` di-refactor — logika intinya (validasi relasi, kode unik, skala, urutan, opsi, tulis kunci jawaban) dipindah ke helper internal `buildQuestionWrite(batch, ...)` yang menerima `batch` dari LUAR. `createQuestion` (satu soal) membuat batch sendiri lalu commit; `createQuestionsBatch()` (dipakai importer) memanggil helper yang SAMA berkali-kali ke SATU `writeBatch` bersama, baru commit sekali di akhir — kalau satu soal gagal di tengah, tidak ada satu pun yang tersimpan. Dibatasi `MAX_IMPORT_BATCH_SIZE = 200` soal/impor (aman di bawah limit 500 operasi/batch Firestore; soal `pilihan_ganda` = 2 operasi per soal). Kunci jawaban pilihan ganda tetap lewat `applyAnswerKey()`/`saveQuestionAnswerKeyInBatch()` yang sudah ada — tidak ada jalur baru.
- **Template prompt disimpan di parameter** (`system_parameters/global.templatePromptSoal`), bisa disunting admin di `/admin/parameter` tanpa redeploy (tombol "Kembalikan ke Default" mengisi ulang dari `DEFAULT_TEMPLATE_PROMPT_SOAL`). Placeholder wajib ada di template (divalidasi saat simpan parameter): `{{KOMPETENSI}}`, `{{JUMLAH}}`, `{{TIPE}}`, `{{SKEMA}}`, `{{KONTEKS}}`. Default sudah diperkuat dengan bagian **MUTU SOAL** (soal spesifik pada situasi kerja nyata bukan pernyataan umum, variasi tingkat kesulitan, pengecoh pilihan-ganda yang masuk akal & panjang opsi setara, larangan "semua benar"/"tidak ada yang benar", satu pernyataan likert = satu kemampuan) — bukan cuma aturan format JSON, supaya hasilnya tidak seperti soal seed lama ("Saya mampu menerapkan X...") yang sah secara skema tapi tidak berguna untuk menilai siapa pun.
- **`{{KONTEKS}}`**: field teks bebas opsional di Langkah 1 (uraian TUSI/unit kerja/istilah lokal), diganti ke prompt apa adanya, atau "(tidak ada catatan konteks tambahan)" kalau kosong.
- **Implikasi kunci jawaban pilihan-ganda TIDAK disembunyikan dari admin**: karena importer memakai jalur `applyAnswerKey()` yang sama seperti pembuatan soal manual (lihat "Tes Pengetahuan & Validasi Tes"), kunci jawaban soal pilihan-ganda yang diimpor tetap ditandai ke periode aktif SAAT diimpor — bukan periode-independen. Kalau ada baris pilihan_ganda, Langkah 3 menampilkan banner eksplisit yang menjelaskan ini (soal sendiri permanen di Bank Soal; hanya kuncinya yang perlu di-refresh manual — edit+simpan ulang soal itu — kalau nanti dipakai lagi di periode baru), dan tombol Simpan otomatis nonaktif kalau tidak ada periode aktif sama sekali. Ini bukan keterbatasan baru — sudah ada sejak fitur Tes Pengetahuan, importer hanya mewarisinya karena sengaja tidak membuat jalur baru.
- **Kompetensi tanpa kode tidak bisa dipilih** di Langkah 1 (checklist difilter ke `Kompetensi.code` yang terisi saja) — kode dipakai AI untuk menandai `kompetensiKode` di JSON, jadi kompetensi tanpa kode perlu diisi dulu di `/admin/kompetensi` sebelum bisa dipakai di importer.
- **Diuji lewat emulator dengan Client SDK sungguhan** (bukan Admin SDK, dan bukan reimplementasi logika) — skrip sekali-pakai memanggil `assemblePromptSoal`, `parseImportPayload`, `validateImportRows`, `createQuestionsBatch` ASLI: rakit prompt dengan placeholder terganti benar; ```json fence`` terstrip & ter-parse; 7 baris uji (1 likert valid, 1 kompetensiKode tak dikenal, 1 pilihan_ganda valid, 1 dengan DUA kunci jawaban, 1 duplikat sesama file, 1 duplikat dengan soal di database, 1 yes_no yang salah punya `opsi`) semuanya menghasilkan valid/invalid + pesan yang tepat; 2 baris valid tersimpan atomik lewat satu batch, kunci jawaban pilihan-gandanya tertulis dengan `periodeId` = periode aktif. Semua lolos. Skrip + data uji dihapus setelah dipakai, tidak masuk repo.

## Segarkan Kunci Jawaban (prosedur wajib per periode baru) — file terkait
```
src/lib/services/question-answer-key.ts  # +listQuestionAnswerKeys, +countStaleAnswerKeys, +refreshAnswerKeysToPeriod
src/hooks/use-question-answer-key.ts     # (baru) useQuestionAnswerKeyList
src/app/(admin)/admin/soal/page.tsx      # tombol header + banner peringatan + dialog konfirmasi
```

### PROSEDUR OPERASIONAL — WAJIB DIIKUTI ADMIN
> **Setiap membuka periode penilaian baru, Super Admin WAJIB menekan "Segarkan Kunci Jawaban" di `/admin/soal` SEBELUM pegawai mulai mengerjakan Tes Pengetahuan.** Kalau lupa, semua kunci jawaban pilihan-ganda masih menunjuk periode lama dan hasil tes tidak akan bisa dinilai (macet di "Menghitung...") sampai disegarkan. Halaman `/admin/soal` sudah menampilkan peringatan otomatis kalau ini terlewat, tapi jangan hanya mengandalkan peringatan — jadikan ini langkah baku setelah mengaktifkan periode. **Ini juga harus masuk ke halaman bantuan pengguna nanti.**

### Kenapa fitur ini ada (latar belakang, dari diagnosa sebelumnya)
`question_answer_keys/{questionId}.periodeId` menandai periode saat kunci disimpan — dipakai `hasSubmittedTestForKey()` di `firestore.rules` untuk gerbang per-periode ("sudah submit tes periode INI baru boleh baca kunci periode INI", bukan sekali-buka-selamanya — lihat "Tes Pengetahuan & Validasi Tes"). Konsekuensinya: soal lama yang dipakai lagi di periode baru perlu `periodeId` kuncinya di-refresh, kalau tidak tes tidak bisa dinilai. Sebelum fitur ini, satu-satunya cara adalah edit+simpan tiap soal manual — tidak realistis untuk 100+ soal. **`firestore.rules` TIDAK diubah sama sekali** untuk fitur ini (by design, hasil diagnosa: pendekatan ini adalah yang paling kecil risikonya dari 2 alternatif yang dievaluasi).

### Ringkasan alur
- `refreshAnswerKeysToPeriod(activePeriodId, actorId, actorRole)`: baca semua `question_answer_keys`, filter yang `periodeId`-nya beda dari periode aktif, tulis ulang lewat `writeBatch` — dipecah per potongan maks 500 operasi (limit Firestore per batch) kalau soalnya sangat banyak. Tidak menyentuh dokumen `questions` sama sekali, hanya kuncinya.
- **"Hanya Super Admin" DITEGAKKAN DI LAPISAN APLIKASI, BUKAN DI RULES** — `firestore.rules` untuk `question_answer_keys.write` masih `isAdmin()` (admin biasa ikut lolos), dan itu sengaja tidak diubah sesuai instruksi "jangan sentuh firestore.rules". `refreshAnswerKeysToPeriod()` melempar error kalau `actorRole !== "super_admin"`, dan tombolnya hanya dirender untuk Super Admin di UI (`isSuperAdmin()` dari `lib/auth/roles.ts`, reuse yang sudah ada). **Batas yang diketahui**: seorang admin biasa yang menulis langsung ke Firestore lewat jalur lain (bukan UI/fungsi ini) secara teknis masih lolos rules — bukan celah baru (rule write sudah begitu sejak awal), tapi belum ditutup rapat untuk aksi spesifik ini.
- **Peringatan otomatis** di `/admin/soal`: dicek saat halaman dibuka lewat hook yang sudah ada (`useAssessmentPeriodList` + `useQuestionAnswerKeyList`, tidak ada mekanisme/polling baru) — kalau ada periode aktif DAN `countStaleAnswerKeys() > 0`, tampil banner kuning dengan jumlah kunci bermasalah + tombol "Segarkan Sekarang" (untuk Super Admin) atau pesan "hubungi Super Admin" (untuk admin biasa, supaya tidak buta terhadap masalah walau tidak bisa menjalankannya sendiri).
- Konfirmasi ditampilkan sebelum menjalankan (jumlah kunci yang akan diperbarui + nama periode tujuan), dan hasil dilaporkan lewat toast setelahnya (mis. "14 kunci jawaban diperbarui ke Periode Uji Coba 2027.").
- **Diuji lewat emulator dengan Client SDK + fungsi asli**: (1) sebelum periode baru dibuka, 0 kunci stale terhadap periode aktif; (2) `createAssessmentPeriod()` aktifkan periode kedua (otomatis menonaktifkan periode lama, logika lama tidak diubah); (3) semua kunci lama terdeteksi stale terhadap periode baru (peringatan akan muncul); (4) `refreshAnswerKeysToPeriod()` memperbarui semuanya dalam satu batch; (5) 0 kunci stale lagi (peringatan akan hilang); (6) dipanggil dengan role `"admin"` (bukan `super_admin`) ditolak dengan pesan yang jelas. Semua lolos.
- **Insiden kecil saat pembersihan data uji** (dicatat demi transparansi): setelah uji di atas, dua dokumen `question_answer_keys` sempat salah diidentifikasi sebagai sisa data uji (ID acak, mirip pola skrip sementara) dan terhapus sebelum diverifikasi bahwa dokumen `questions` pasangannya masih ada dan valid (bukan sisa uji — kemungkinan dibuat lewat halaman Impor Soal AI yang sungguhan). Langsung ketahuan dari timestamp `createdAt` yang jauh lebih awal dari skrip uji, dan segera dipulihkan dari data yang sempat terbaca sebelum penghapusan (`correctValue` sama persis, `periodeId` disetel ke periode aktif saat ini). Tidak ada kehilangan data permanen, tapi jadi pengingat: sebelum menghapus dokumen "yang terlihat seperti sisa uji", verifikasi originnya (timestamp, isi) dulu — jangan hanya menduga dari pola ID.

## Tong Sampah Soal — file terkait
```
src/types/question.ts                    # Question +trashedAt (IsoDateString | null)
src/lib/services/question.ts             # +trashQuestionsInBatch, +restoreQuestionsInBatch, +hasQuestionBeenAnswered, +deleteQuestionsPermanently
src/lib/services/question-answer-key.ts  # +findOrphanedActiveMultipleChoiceQuestions (pure function, dari data yang sudah dimuat)
src/lib/services/test-session.ts         # +listAllTestSessions (semua periode, dipakai cek "pernah dijawab")
src/app/(admin)/admin/soal/page.tsx      # checkbox pilih-banyak, aksi Buang (satu+massal), tautan+badge Tong Sampah, banner soal yatim
src/app/(admin)/admin/soal/tong-sampah/page.tsx  # (baru) daftar soal dibuang, Pulihkan, Hapus Permanen
src/components/admin/nav.ts              # +ADMIN_ROUTES.soalTongSampah + page meta
firestore.rules                          # lihat ringkasan di bawah — SATU-SATUNYA perubahan rules di tugas ini
```

Route baru: `/admin/soal/tong-sampah`.

### Ringkasan alur
- **Buang** (bukan hapus): set `trashedAt` + paksa `isActive:false`. Karena SEMUA jalur kuesioner (self assessment, Tes Pengetahuan) sudah menyaring `isActive` sejak awal, soal yang dibuang otomatis hilang dari kuesioner **tanpa menyentuh satu baris pun** di `self-assessment.ts`/`tes-pengetahuan/page.tsx` — murni efek samping dari memaksa `isActive:false`. **Pulihkan** hanya menghapus `trashedAt`; status tetap Nonaktif (admin mengaktifkan lagi secara sadar lewat aksi Aktifkan yang sudah ada) — desain ini sengaja supaya tidak ada soal yang "tiba-tiba aktif lagi" tanpa admin benar-benar memutuskannya.
- **Hapus Permanen — pertama kalinya ada hard-delete di aplikasi ini** (sebelumnya "Tidak ada hard-delete" adalah keputusan tetap, lihat poin 9 di bawah — masih berlaku untuk SEMUA data lain, hanya soal yang punya jalur permanen sekarang, dan hanya lewat Tong Sampah). Tiga lapis proteksi, SEMUA ditegakkan ulang di `deleteQuestionsPermanently()` sendiri (bukan cuma dipercayakan ke state UI): (1) hanya `super_admin` (dicek di kode DAN sekarang juga di `firestore.rules`, lihat di bawah); (2) hanya soal yang statusnya sudah `trashedAt` terisi (tidak bisa loncat langsung dari daftar utama); (3) `hasQuestionBeenAnswered()` mengecek ULANG ke `assessment_answers` (query `questionId`) dan, khusus pilihan_ganda, ke `test_sessions` (jawaban tersimpan di dalam array dokumen, jadi discan di sisi klien lewat `listAllTestSessions()`) — kalau SATU SAJA soal yang diminta pernah dijawab, SELURUH permintaan (termasuk yang lain dalam batch massal) ditolak, tidak ada yang terhapus. Soal pilihan ganda menghapus `question_answer_keys`-nya di batch yang sama (tidak pernah ada kunci yatim).
- **firestore.rules — SATU-SATUNYA perubahan rules di tugas ini**: `questions` dipecah dari `allow write: if isAdmin();` menjadi `allow create, update: if isAdmin();` + **`allow delete: if isSuperAdmin();`** (baru). `question_answer_keys` **SENGAJA TIDAK DIUBAH** (tetap `isAdmin()` untuk semua operasi termasuk delete) — diperiksa dulu (bukan diasumsikan): alur ganti-tipe-soal yang sudah ada (`updateQuestion()`, pilihan ganda → likert) BENAR-BENAR men-delete dokumen `question_answer_keys` lewat `batch.delete()`, dipakai admin biasa sebagai bagian rutin edit soal. Menyamakan jadi `isSuperAdmin()` akan mematahkan alur edit itu untuk semua admin biasa (satu batch atomik, satu operasi ditolak = seluruh commit gagal) — bukan cuma menutup celah, tapi regresi fitur yang sudah ada. **Risiko yang diketahui dan tetap ada** (bukan celah baru, kelas yang sama dengan "Segarkan Kunci Jawaban"): admin biasa yang menulis langsung ke Firestore di luar UI masih bisa menghapus SATU dokumen `question_answer_keys` tanpa menghapus soalnya — mitigasinya adalah peringatan "soal yatim" di bawah, bukan rules.
- **Peringatan "soal yatim"**: `findOrphanedActiveMultipleChoiceQuestions()` (pure function, tidak ada query/mekanisme baru) menandai soal pilihan ganda AKTIF (bukan Nonaktif, bukan di Tong Sampah) yang tidak punya dokumen `question_answer_keys` sama sekali — dihitung dari `useQuestionList()` + `useQuestionAnswerKeyList()` yang SUDAH dimuat halaman `/admin/soal`. Tampil sebagai banner merah berisi daftar soal (tertaut ke halaman edit) begitu halaman dibuka.
- **Diuji lewat emulator dengan Client SDK + fungsi asli** (10 skenario, semua lolos): soal baru (belum dijawab) terdeteksi `hasQuestionBeenAnswered()=false`; soal likert seed yang sudah dijawab self-assessment terdeteksi `true` (lewat `assessment_answers`); soal pilihan ganda seed yang sudah dijawab lewat `test_sessions` terdeteksi `true`; `trashQuestionsInBatch` menandai field dengan benar; hapus permanen DITOLAK untuk soal yang sudah dijawab (meski sudah di-trash); DITOLAK untuk soal yang belum di-trash; DITOLAK kalau `actorRole` bukan `super_admin`; BERHASIL untuk soal bersih (sekaligus membuktikan `question_answer_keys` ikut terhapus, tidak ada yatim); **rules**: akun ber-role `admin` biasa (dinaikkan sementara dari `pegawai`, bukan `super_admin`) DITOLAK `permission-denied` saat mencoba `deleteDoc` langsung ke `questions` — membuktikan pembatasan ini SUNGGUHAN di level database, bukan cuma UI; akun `admin` biasa yang sama MASIH BISA `updateDoc` ke `questions` — membuktikan alur edit soal normal tidak rusak. State uji (role user, soal trash) dikembalikan, lalu di-reseed ulang untuk kepastian bersih.

## Bantuan, Logo & Tentang — file terkait
```
src/app/bantuan/layout.tsx           # (baru) AuthGate area="dashboard" — siapa pun yang login & aktif boleh masuk
src/app/bantuan/page.tsx             # (baru) isi bantuan per role + blok Tentang
src/components/admin/nav.ts          # +tautan "Bantuan" di ADMIN_NAV
src/components/dashboard/nav.ts      # +tautan "Bantuan" di DASHBOARD_NAV
src/types/parameter.ts               # SystemParameters +logoUrl
src/lib/services/system-parameter.ts # default logoUrl "", normalize (trim saja, tanpa validasi format ketat), map baca
src/app/(admin)/admin/parameter/page.tsx  # input URL logo + pratinjau kecil (onError = gagal diam-diam)
src/components/shared/brand-mark.tsx # (baru) logo+namaInstansi di sidebar, dipakai AdminShell & DashboardShell
```

Route baru: `/bantuan` — DI LUAR `(admin)`/`(dashboard)` route group (pola sama seperti `/pending`), jadi bisa diakses dari kedua shell tanpa duplikasi konten. Guard `area="dashboard"` (fungsi `requireDashboardArea` yang sudah ada = siapa pun yang login+aktif+non-pending, termasuk admin).

### Ringkasan alur
- **Isi disesuaikan role**: bagian Pegawai & Atasan selalu tampil ke siapa pun yang login (siapa pun bisa jadi atasan seseorang — bukan role terpisah, jadi tidak digerbang lebih ketat); bagian Admin hanya untuk `canAccessAdmin()`. Skala 1-5 dibaca dinamis dari `system_parameters/global.labelSkala` (bukan teks tetap), supaya kalau admin ganti skala di Parameter Sistem, halaman bantuan otomatis ikut berubah.
- **Tiga klarifikasi tambahan** (dari pengalaman menguji langsung): (1) kotak opsi pilihan ganda berisi placeholder "Opsi 1" dst yang **wajib diganti** teks jawaban sungguhan sebelum simpan; (2) posisi radio kunci jawaban **sebaiknya diacak** antar soal supaya polanya tidak tertebak pegawai; (3) "Perlu Ditinjau" pada Validasi Tes **bukan berarti penilaian pegawai salah** — cuma skor tes di bawah ambang, bahan pertimbangan atasan.
- **`logoUrl`**: string URL biasa, TIDAK ada upload file/Firebase Storage (sesuai instruksi). Kosong = tidak tampil apa-apa (fallback ke label bawaan "TNA Kompetensi"). Validasi di `normalizeSystemParametersInput` cuma `trim()` — sengaja tidak divalidasi format URL secara ketat (kesederhanaan > kelengkapan validasi untuk field opsional low-risk ini).
- **`BrandMark`**: dipasang di blok judul sidebar `AdminShell` & `DashboardShell` (ganti teks statis "Admin Panel"/"Pegawai" + "TNA Kompetensi" jadi dinamis). Pakai `<img>` biasa (bukan `next/image`) karena URL logo bebas dari admin tidak bisa di-allowlist domainnya. `onError` menyembunyikan gambar diam-diam kalau URL rusak — tidak pernah membuat layout pecah. Pratinjau yang sama juga ada di form `/admin/parameter` supaya admin bisa langsung tahu kalau URL yang diisi salah.
- **Blok "Tentang"**: statis di bagian bawah `/bantuan`, teks kecil tidak mencolok (badge outline + beberapa baris teks kecil), berisi nama sistem, versi, pengembang, dan stack teknologi persis seperti yang diminta.
- **Panduan "Memulai dari Nol" (setup awal dari data kosong)** — Card baru khusus admin, paling atas di bagian Admin, 12 langkah bernomor dengan satu skenario konsisten dari awal sampai akhir (Balai Pelatihan Kesehatan Provinsi Nusantara — fiktif, bukan instansi sungguhan). Konten murni, TIDAK ada perubahan logika/service/rules untuk bagian ini.
  - **Koreksi urutan yang diverifikasi ke kode** (bukan cuma diikuti dari draf): **Periode Penilaian dipindah SEBELUM Bank Soal** (bukan sesudahnya seperti draf awal) — `applyAnswerKey()` di `question.ts` menandai kunci jawaban soal pilihan ganda dengan periode aktif SAAT soal disimpan, dan melempar `QuestionError` kalau belum ada periode aktif sama sekali. Kalau urutan draf awal diikuti apa adanya, admin akan mentok error "Tidak ada periode aktif" begitu mencoba menyimpan soal pilihan ganda pertama.
  - Ditandai juga field yang TIDAK strict wajib meski ada di daftar urutan (supaya admin tidak salah kira semuanya blocking): TUSI (self assessment jatuh ke soal umum kalau kosong), Pangkat/Golongan (tidak memengaruhi Gap/skor sama sekali), Level Kompetensi (fallback otomatis skala 1-5 kalau koleksi kosong — lihat `resolveScaleRange` di `question.ts`), dan Jabatan.unitKerjaId (ada di tipe data tapi belum dipakai form Jabatan, jangan dicari).
  - Penjelasan `supervisorId` (sumber kebingungan paling sering menurut laporan langsung): menu "Penilaian Atasan" muncul HANYA lewat `useHasSubordinates()` → `listSubordinates()` yang query `users` dengan `where('supervisorId','==',uid)` — jadi field itu diisi di halaman EDIT PROFIL BAWAHAN, bukan di profil atasan sendiri. Ditulis eksplisit di panduan supaya admin tidak mengira fiturnya rusak.

## Insiden Produksi: `usedAt` Hilang — Pendaftaran Tertutup Gagal Total

**Gejala di produksi** (`tna-blk-kesehatan`): login Google pertama kali untuk email yang sudah diundang (role `super_admin`) menampilkan "Mengalihkan..." lalu kembali ke halaman login. `user_invitations/{email}` tidak pernah tertandai `usedAt`, dan collection `users` tidak pernah terbentuk sama sekali — akun Auth yang sempat dibuat ikut terhapus lagi (rollback bekerja seperti dirancang).

**Akar masalah**: dokumen undangan itu dibuat MANUAL lewat Firestore Console (mengikuti panduan bootstrap super_admin pertama di respons sesi sebelumnya — panduan itu keliru menyuruh membiarkan `usedAt` kosong). `firestore.rules` di dua tempat memakai `....data.usedAt == null` — di Firestore Rules, mengakses field peta yang **TIDAK ADA** lewat `.data.field` menghasilkan *evaluation error* (dianggap `false`/ditolak), BEDA dari field yang eksplisit bernilai `null`. `createInvitation()` (alur normal lewat `/admin/persetujuan-akun`) SELALU menulis `usedAt: null` eksplisit — jadi bug ini tidak pernah kena lewat alur UI biasa, hanya lewat dokumen buatan Console.

### Perbaikan (`firestore.rules`) — audit MENYELURUH, bukan cuma 2 titik yang diminta
Semua akses field langsung (`.data.field` / `get(ref).data.field`) di seluruh file diperiksa satu per satu. **7 titik diperbaiki** jadi `.data.get('field', default)`, di 2 collection yang TERBUKTI/BERISIKO ditulis manual lewat Console (`users`, `user_invitations`):
- `userExists()`: `.get('status', null) == 'aktif'`
- `hasRole()`: `.get('role', null) in roles`
- `isSupervisorOf()`: `.get('supervisorId', null) == request.auth.uid`
- `hasUsableInvitation()`: `.get('usedAt', null) == null` (diminta eksplisit) + `.get('role', null) == role`
- `users/{userId}` read rule: `.get('supervisorId', null) == request.auth.uid`
- `user_invitations/{email}` update rule: `.get('usedAt', null) == null` (diminta eksplisit)

**SENGAJA TIDAK diubah**: `test_sessions`, `assessments`, `training_proposals`, `tna_recaps`, `question_answer_keys` — field yang diakses di sana (`status`, `employeeId`, `assessorId`, `type`, `skorPerKompetensi`, `periodeId`) selalu diwajibkan oleh rule `create` collection yang sama (self-consistent secara struktural — tidak ada dokumen yang bisa lolos `create` tanpa field itu), dan TIDAK ADA praktik operasional yang mengedit collection ini manual lewat Console (beda dari `users`/`user_invitations` yang terbukti kena). Mengubahnya hanya menambah luas pengujian ulang tanpa menutup risiko nyata — termasuk berisiko pada rule `test_sessions`/`question_answer_keys` yang jadi tumpuan 4 jaminan keamanan Tes Pengetahuan yang sudah terbukti.

### Diuji lewat emulator, Client SDK, fungsi ASLI (`registerWithEmail`, bukan reimplementasi) — 8 skenario, semua lolos
Dokumen fixture dibuat presisi lewat Admin SDK (satu-satunya cara membuat dokumen TANPA field `usedAt` sama sekali — `createInvitation()` klien selalu menulis `null` eksplisit): (1) undangan `usedAt:null` eksplisit → daftar berhasil; (2) undangan TANPA field `usedAt` sama sekali (persis kasus produksi) → **daftar berhasil** (ini yang tadinya gagal); (3) **regresi**: undangan yang SUDAH `usedAt` terisi tetap ditolak dengan pesan yang sama; (4) kedua undangan (1)(2) benar tertandai `usedAt` setelah dipakai. Lanjut mengulang 4 uji keamanan kunci jawaban dari sesi sebelumnya — semua tetap lolos tanpa melemah: (a) belum submit tes → ditolak baca kunci; (b) sudah submit → berhasil baca kunci periode aktif; (c) kunci periode lain → tetap ditolak; (d) skor `test_sessions` yang sudah terisi tidak bisa ditimpa lagi. Akun Auth + dokumen uji dihapus, emulator di-reseed ulang ke state bersih setelahnya.

### BELUM DI-DEPLOY ke produksi
`firestore.rules` lokal sekarang berisi DUA perbaikan yang belum sampai ke produksi: (1) fix `usedAt` (`.get('field', default)`), (2) `email_verified` di `userExists()`. Keduanya di file yang sama, jadi **satu kali deploy** membawa keduanya sekaligus — **wajib** dijalankan manual, jangan sampai lupa:
```
firebase deploy --only firestore:rules --project tna-blk-kesehatan
```
Sampai perintah ini dijalankan: (a) bug `usedAt` masih ada di produksi — pendaftaran tertutup untuk undangan baru yang dibuat manual lewat Console akan tetap gagal; (b) akun email/password yang BELUM verifikasi email TETAP punya hak role penuh di produksi (celah privilege-escalation dari undangan yang diklaim orang lain BELUM tertutup) — tapi ini tidak mendesak seperti (a) karena belum ada satu pun akun email/password di produksi saat ini (satu-satunya akun, super_admin, masuk lewat Google). Undangan yang sudah "diperbaiki manual" (ditambah `usedAt: null` lewat Console) tidak terpengaruh either way oleh perbaikan (a).

## Lupa Password & Verifikasi Email — file terkait
```
src/lib/auth/session.ts             # +sendPasswordReset, +resendEmailVerification, registerWithEmail() +sendEmailVerification()
src/app/(auth)/lupa-password/page.tsx   # (baru) form + pesan generik anti-enumerasi
src/app/(auth)/login/page.tsx           # +tautan "Lupa kata sandi?"
src/lib/auth/constants.ts           # +FORGOT_PASSWORD_PATH, +VERIFY_EMAIL_PATH
src/lib/auth/guards.ts              # +GuardArea "verify-email", requireAuthenticated/requireAdminArea/requireDashboardArea +param emailVerified, +requireVerifyEmailArea
src/components/auth/auth-provider.tsx   # +state emailVerified, +refreshEmailVerification() (murni baca ulang Auth SDK, TIDAK menulis Firestore)
src/components/auth/auth-gate.tsx   # thread emailVerified ke resolveAreaGuard
src/app/verifikasi-email/layout.tsx + page.tsx  # (baru) halaman tunggu verifikasi, tombol Kirim Ulang (cooldown 60 detik) + Saya Sudah Verifikasi
```

Route baru: `/lupa-password`, `/verifikasi-email`.

### Lupa Password — ringkasan
- `sendPasswordReset()` cuma membungkus `sendPasswordResetEmail` bawaan Firebase Auth — tidak ada logika baru.
- **Anti-enumerasi**: `auth/user-not-found` DITANGKAP KHUSUS di halaman dan diperlakukan SAMA seperti sukses (pesan sama persis) — satu-satunya kode error yang disembunyikan, karena itu satu-satunya yang membocorkan "email ini terdaftar atau tidak". Error lain (format salah, rate limit, jaringan) tetap ditampilkan apa adanya karena itu soal input yang baru diketik, bukan data akun orang lain.
- Catatan untuk pengguna Google ditampilkan statis di halaman (bukan hasil `fetchSignInMethodsForEmail` — API itu SENDIRI bocor informasi "email ini pakai provider apa", jadi sengaja tidak dipakai, supaya konsisten dengan prinsip anti-enumerasi di atas).

### Verifikasi Email — ringkasan & keputusan desain
- `registerWithEmail()` memanggil `sendEmailVerification()` SETELAH `createProfileForNewAccount()` berhasil (bukan sebelum — kalau gagal, akun sudah di-rollback/dihapus, mubazir kirim tautan untuk akun yang sudah tidak ada). Kegagalan kirim email di-`catch` diam-diam — pendaftaran tetap dianggap sukses, pengguna masih bisa klik "Kirim Ulang".
- **Tidak ada pemanggil baru yang membuat profil** — `createProfileForNewAccount`/`buildNewProfile` di `session.ts` SAMA SEKALI TIDAK diubah strukturnya, cuma ditambah satu baris `sendEmailVerification` setelah return-nya. Ini sengaja untuk tidak mengulang race condition insiden sebelumnya.
- **Gerbang murni di lapisan aplikasi, bukan Firestore** — `emailVerified` datang dari Firebase Auth `User.emailVerified` (disimpan sebagai state primitif terpisah di `AuthProvider`, BUKAN field baru di dokumen `users/{uid}` — tidak ada tulisan Firestore baru sama sekali untuk fitur ini). `requireAuthenticated()` di `guards.ts` mengecek urutan: profil ada → aktif → BUKAN pending → **BARU** emailVerified. Google selalu `emailVerified: true` dari provider sejak awal, jadi otomatis tidak pernah kena gerbang ini (tidak perlu pengecekan provider terpisah).
- **Kenapa tidak bisa loop**: `/verifikasi-email` (`requireVerifyEmailArea`) HANYA memantulkan KELUAR (ke dashboard/admin) begitu `emailVerified` sudah true — tidak pernah memantulkan balik ke `/verifikasi-email` untuk state yang sama. Dashboard/admin HANYA memantulkan ke `/verifikasi-email` kalau `emailVerified` false. Tidak ada kombinasi state yang membuat kedua sisi saling redirect.
- **`refreshEmailVerification()`**: Firebase Auth tidak memantau perubahan `emailVerified` secara realtime (klik tautan di tab/perangkat lain tidak memicu event apa pun di sesi ini) — harus diminta manual lewat `user.reload()`. Disimpan sebagai state `boolean` TERPISAH (bukan `setUser(user)` lagi), karena `reload()` memutasi objek `User` yang SAMA (reference tidak berubah) — kalau cuma `setUser(sameRef)`, React tidak akan render ulang. Ini murni pembacaan ulang Auth SDK, tidak ada tulisan Firestore, jadi tidak menambah "penulis profil" baru.

### Diuji — apa yang BISA dan TIDAK BISA diuji di lingkungan ini
Browser automation tidak tersedia di sesi ini (ekstensi Chrome tidak terhubung), jadi alur redirect React (`AuthGate`) tidak bisa diklik langsung di browser sungguhan. Yang SUDAH diuji nyata:
- **Logika guard murni** (`resolveAreaGuard()` ASLI dipanggil langsung, 9 kombinasi status × emailVerified × area): unauthenticated→login, aktif+belum verified→`/verifikasi-email` (termasuk untuk area admin — verifikasi diperiksa SEBELUM cek role), aktif+verified→ok, halaman verify-email sendiri ok saat belum verified dan memantul keluar saat sudah, pending selalu menang duluan atas emailVerified, dan pembuktian eksplisit tidak ada pasangan redirect 2-arah. Semua lolos.
- **Mekanika Auth via emulator, Client SDK, fungsi ASLI** (`registerWithEmail`, `resendEmailVerification`, bukan reimplementasi): setelah daftar, `emailVerified=false`; `sendEmailVerification` BENAR-BENAR mengirim kode (dicek lewat Auth Emulator REST API `/emulator/v1/.../oobCodes`, bukan cuma "tidak error"); `resendEmailVerification()` mengirim kode tambahan; sebelum `reload()` cache lokal masih `false` (bukti kenapa perlu refresh manual); setelah `reload()` jadi `true`. Semua lolos. Akun seed lama (`admin@seed.test` dkk.) dikonfirmasi tetap `emailVerified: true` — tidak ada yang mendadak terkunci.
- **BELUM diuji**: klik-tembus sungguhan di browser (render `AuthGate`, transisi halaman, tombol "Kirim Ulang"/"Saya Sudah Verifikasi" sungguhan). Logika di baliknya sudah diverifikasi lewat dua jalur di atas, tapi rekomendasi: satu kali coba manual di browser sebelum benar-benar dipakai pengguna nyata.

### `firestore.rules`: `email_verified` di `userExists()` — SUDAH DIEKSEKUSI & TERUJI
Instruksi asli ("undangan tertutup hanya boleh ditandai terpakai oleh email yang terverifikasi") **berbenturan langsung** dengan alur registrasi atomik yang ada (`hasUsableInvitation()`/create `users` terjadi SAAT ITU JUGA, padahal `email_verified` pasti masih `false` di momen itu) — kalau syarat ditaruh di `hasUsableInvitation()`, SETIAP pendaftaran tertutup lewat email/password akan gagal & rollback, mengulang insiden hari ini secara permanen by design. **Resolusi yang dipakai**: syarat `request.auth.token.email_verified == true` ditaruh di `userExists()` (dipakai `hasRole()`→`isAdmin()`/`isSuperAdmin()`/`isModerator()`), BUKAN di `hasUsableInvitation()`. Undangan tetap langsung tertandai terpakai seperti sekarang (bookkeeping tidak berubah) — yang dikunci murni PEMAKAIAN privilege role-nya. Penyerang yang mengklaim email orang lain untuk mencuri undangan tidak akan pernah bisa memverifikasi email itu, jadi tidak pernah bisa memakai privilege-nya (undangan itu sendiri terlanjur "terbakar" — perlu dibuat undangan baru kalau ini terjadi, trade-off yang jujur karena tidak ada backend untuk menunda penulisan sampai verifikasi selesai).

**Sebelum eksekusi, diverifikasi EMPIRIS (bukan asumsi) tiga hal yang bisa mengunci super_admin produksi keluar**, lewat sign-in Google SUNGGUHAN di emulator (fitur fake-IdP bawaan Auth Emulator, menjalankan jalur `signInWithIdp` yang sama seperti popup Google asli — bukan cuma set field manual):
1. Google → `user.emailVerified=true` DAN `token.claims.email_verified=true` DAN `firebase.sign_in_provider=google.com` — dibuktikan lewat sign-in Google nyata, bukan dokumentasi. Akun super_admin produksi (Google) AMAN.
2. Token yang sudah terbit tidak perlu logout-login — beda dari email/password (yang transisi `false`→`true` di tengah sesi), Google `emailVerified` sudah `true` sejak detik pertama sign-in, tidak ada state basi untuk direfresh.
3. Akun seed emulator sudah `emailVerified: true` (`scripts/seed-dev.ts:286`, dikonfirmasi juga lewat query langsung ke emulator) — tidak ada yang mendadak terkunci.

**Diuji ulang di emulator setelah rules diterapkan** (Client SDK, fungsi/rules ASLI, fixture presisi lewat Admin SDK untuk kombinasi yang tidak bisa dibuat lewat UI biasa) — 7 skenario, semua lolos: (1) super_admin dengan email terverifikasi → tetap bisa menulis (akses penuh, tidak ada regresi); (2) akun terverifikasi TAPI status `pending` → tetap ditolak (pending menang duluan atas emailVerified, urutan pengecekan benar); (3) akun status `aktif` + role `admin` TAPI belum verifikasi → **ditolak** (ini yang membuktikan perbaikannya benar-benar menutup celah privilege-escalation); (a)-(d) 4 uji keamanan kunci jawaban dari sesi-sesi sebelumnya — semua tetap lolos, tidak melemah.

### Jalan keluar admin kalau pegawai tidak menerima email verifikasi
Tidak ada tombol admin di UI untuk ini (di luar cakupan tugas — dicatat sebagai kemungkinan fitur lanjutan, bukan dibangun sekarang). Jalan keluar yang ADA hari ini:
1. **Salah ketik alamat email**: admin hapus akun Auth-nya (Firebase Console → Authentication → cari berdasarkan email → Delete user) DAN dokumen `users/{uid}` di Firestore, lalu — kalau mode tertutup — kosongkan lagi `usedAt` undangan supaya bisa dipakai daftar ulang dengan email yang benar.
2. **Email benar tapi tidak sampai (masuk spam / masalah pengiriman)**: butuh Admin SDK (`FIREBASE_ADMIN_*` — lihat `.env.example`), jalankan sekali: `getAuth(adminApp).updateUser(uid, { emailVerified: true })` — pola yang SAMA persis dipakai skrip uji di atas (Admin SDK melewati rules by design, ini operasional yang wajar untuk mengoreksi masalah pengiriman email, bukan celah keamanan). Firebase Console sendiri TIDAK punya tombol langsung untuk menandai `emailVerified` pada akun email/password — jalur realistis-nya lewat skrip Admin SDK satu kali (mirip pola `scripts/seed-dev.ts`), bukan klik di Console.

## Keputusan penting
2. Nilai `apiKey` / `appId` dummy boleh dipakai selama flag emulator `true`.
3. Host emulator memakai `127.0.0.1`, bukan `localhost` (hindari masalah IPv6 di Windows).
4. Cookie session tetap UX-only; sumber kebenaran role = Firestore.
5. **Level Unit Kerja 1-based**: root = 1, anak = induk + 1. Field `level` di form read-only (dihitung dari `parentId`).
6. Field Unit Kerja: `name`, `code`, `parentId`, `level`, `path`, `sortOrder`, `isActive`, audit.
7. `path` memakai ID dokumen (`/parentId/childId`) supaya stabil saat kode berubah.
8. `code` Unit Kerja dan Jabatan dinormalisasi uppercase, unik di koleksinya.
9. Tidak ada hard-delete. Status dikontrol lewat aktif/nonaktif. **Pengecualian sejak fitur Tong Sampah Soal**: soal (`questions`) sekarang bisa dihapus permanen, tapi HANYA lewat `/admin/soal/tong-sampah`, HANYA `super_admin`, dan HANYA yang belum pernah dijawab siapa pun — lihat bagian "Tong Sampah Soal". Entitas lain (Unit Kerja, Jabatan, Kompetensi, dll.) tetap tidak punya hard-delete sama sekali.
10. Pola CRUD Unit Kerja jadi acuan Jabatan dan Pangkat.
11. **Link yang terlihat seperti tombol** memakai `buttonVariants()` pada `<Link>`, bukan `<Button render={<Link />} />`.
12. **`DropdownMenuLabel` harus di dalam `DropdownMenuGroup`**.
13. **Jabatan** field form: `name`, `code`, `eselon` (opsional I–V), `isActive`. Relasi `unitKerjaId` / `tusiIds` / `description` disimpan default (`null` / `[]`) dan **belum** diekspos di UI.
14. **Pangkat** field form: `name`, `golongan` (contoh `III/a`), `sortOrder` (urutan), `isActive`. Nama dan golongan unik. Golongan dinormalisasi jadi `III/a`.
15. Sidebar Master Data urutan: Unit Kerja → Jabatan → Pangkat / Golongan → TUSI → Level Kompetensi → Kompetensi → Bank Soal.
16. **TUSI** field form: `name` (judul), `code` (opsional, unik jika diisi), `unitKerjaId` (wajib), `jabatanId` (opsional), `description`, `isActive`. Nama unik per unit kerja. `kompetensiIds` disimpan `[]` dan belum diekspos. Relasi ke User / Bank Soal belum dibuat.
17. **Level Kompetensi** adalah skala global (`kompetensi_levels` dengan `kompetensiId: null`). Field: `name`, `code` (opsional), `level` (nilai/urutan unik), `description`, `isActive`. Seed default 5 level (STM 1 … SM 5) lewat tombol jika koleksi kosong. Urutan bisa diubah naik/turun (tukar nilai).
18. **Kompetensi** field form: `name`, `code` (opsional), `dimensi` (`pengetahuan` / `keterampilan` / `sikap_perilaku`), `description`, `levelIds` (opsional; kosong = semua level aktif), `isActive`. `category` disimpan default `lainnya` dan belum diekspos. Relasi ke jabatan (`standar_kompetensi`) belum dibuat.
19. **Bank Soal** field form: `text`, `code` (opsional), `type` (`likert` / `multiple_choice` / `yes_no`; default dan prioritas `likert`), `kompetensiId` (opsional), `tusiId` (opsional), `dimensi` (otomatis dari kompetensi, bisa diubah), `sortOrder`, `isActive`. Skala likert memakai min/max dari level aktif (fallback 1–5). Ya/Tidak menyimpan opsi tetap. Pilihan ganda sekarang punya editor opsi (min 2, satu jawaban benar) — lihat "Tes Pengetahuan & Validasi Tes". Penyusunan kuesioner belum dibuat.
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
- Fitur Export Rekap TNA ke format Excel / PDF (opsional untuk pengembangan berikutnya)
- `skalaMaksimum`/`labelSkala` di `system_parameters` belum dipakai di UI mana pun (form self/supervisor assessment masih hardcode skala 1-5 lewat `kompetensi_levels`, bukan dari parameter ini).
- Penilaian sisi-server yang tidak bisa dikarang client untuk Tes Pengetahuan — lihat utang teknis di bagian "Tes Pengetahuan & Validasi Tes" (butuh Cloud Functions/Admin SDK, sama seperti A5).
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
- Soal pilihan ganda + Tes Pengetahuan + kolom Validasi Tes sudah selesai dan sudah diuji lewat emulator, termasuk verifikasi ulang angka gap Pegawai B lewat pemanggilan langsung `computeEmployeeCompetencyScores()` yang asli (lihat bagian "Tes Pengetahuan & Validasi Tes"). Ada dua keputusan desain yang TIDAK BOLEH dibalik tanpa diskusi ulang: (1) kunci jawaban tes digerbang per-periode lewat `test_sessions/{uid}_{periodeId}` + `periodeId` di `question_answer_keys`, BUKAN gerbang per-uid sekali-buka-selamanya; (2) `test_sessions.skorPerKompetensi` hanya boleh transisi `null` → terisi sekali, dan `answers` terkunci permanen sejak `create` — jangan longgarkan rule ini demi kemudahan edit ulang.
- `emulator-data/` sempat dikosongkan lalu di-seed ulang (`npm run seed:dev`) untuk menguji rules baru dari kondisi bersih — kalau ada yang terasa hilang dari data emulator sebelumnya, itu sebabnya. Terakhir di-reset lagi di tugas Tes Pengetahuan ini (emulator di-restart bersih untuk memvalidasi `firestore.rules` yang baru, lalu di-seed ulang) — kalau menjalankan emulator lagi, jalankan `npm run seed:dev` dulu sebelum mengetes fitur apa pun secara manual.
- Tong Sampah Soal, halaman `/bantuan`, dan logo instansi sudah selesai dan sudah diuji lewat emulator (lihat bagian "Tong Sampah Soal" dan "Bantuan, Logo & Tentang"). Satu-satunya perubahan `firestore.rules` di seri tugas ini: `questions` delete sekarang `isSuperAdmin()` (dulu ikut `isAdmin()` seperti create/update). `question_answer_keys` delete SENGAJA TIDAK ikut diperketat — jangan diubah tanpa diskusi ulang, karena alur ganti-tipe-soal (`updateQuestion()`) memakainya secara rutin lewat `isAdmin()` biasa; menyamakannya akan mematahkan fitur edit soal yang sudah ada, bukan menutup celah.
- Jangan mengubah arsitektur besar tanpa persetujuan.
- Setiap selesai tahap, update file ini.
