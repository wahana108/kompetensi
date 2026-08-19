# Project: Sistem Penilaian Kompetensi Pegawai + TNA

## Visi
Membangun web application untuk proses **Penilaian Kompetensi Pegawai** yang berujung pada **Training Needs Analysis (TNA)**. Sistem harus fleksibel, configurable dari Admin Panel, dan tidak memerlukan coding ulang untuk perubahan data master, soal, TUSI, standar kompetensi, maupun parameter penilaian.

## Referensi Utama
Diagram Bisnis Proses: BISNIS PROSES PENILAIAN KOMPETENSI PEGAWAI
Alur: Identitas Responden → Tempat Tugas → TUSI → Kuesioner Penilaian Diri → Penilaian Kompetensi Individu (Self + Atasan + Rekomendasi) → Rekap Usulan Pelatihan → Rekap TNA

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Auth**: Firebase Authentication (Google + Email/Password, + reset password + verifikasi email)
- **Database**: Cloud Firestore
- **Backend Logic**: **TIDAK ADA** — dikoreksi dari rencana awal ("Firebase Cloud Functions") karena pada akhirnya sengaja tidak dipakai, bukan sekadar belum sempat dibuat. Folder `functions/` tidak pernah dibuat. Seluruh logika bisnis (hitung gap kompetensi, generate Rekap TNA, submit & nilai Tes Pengetahuan, dll) berjalan sebagai kode client (`firebase/firestore` client SDK) langsung dari browser pengguna, dengan **`firestore.rules` sebagai satu-satunya penegak keamanan**. Alasan: skala target (satu instansi, puluhan pegawai) tidak sepadan dengan biaya membangun & mengoperasikan backend terpisah. Trade-off dari keputusan ini didokumentasikan lengkap sebagai utang teknis di `docs/konteks.md` (bagian "Utang Teknis (Ringkasan Terkonsolidasi)") — terutama: tidak ada verifikasi session server-side kriptografis, dan skor Tes Pengetahuan secara teori bisa dikarang lewat DevTools karena tidak ada server yang menghitung ulang secara independen. `firebase-admin` tetap terpasang tapi hanya dipakai skrip developer lokal (`scripts/seed-dev.ts`), bukan bagian aplikasi yang di-deploy.
- **Hosting**: Vercel (Frontend) + Firebase — **sudah live**: `kompetensi-chi.vercel.app` + Firebase project `tna-blk-kesehatan`.
- **Development**: VSCode + Firebase Emulator + Claude Code

## Role System
| Role | Keterangan | Akses Utama |
|------|----------|-------------|
| Super Admin | Admin utama | Semua akses + menunjuk Admin/Moderator + pengaturan sistem |
| Admin | Ditunjuk Super Admin | Kelola master data, soal, TUSI, standar, monitoring |
| Moderator | Opsional | Hak baca/tulis tambahan di `firestore.rules` untuk `assessments`/`training_proposals`/`tna_recaps` — **TIDAK PUNYA halaman Admin Panel sendiri**. `canAccessAdmin()` di kode hanya mengizinkan `super_admin`/`admin` masuk `/admin`, jadi role ini praktis tidak bisa dipakai sampai ada UI khusus untuknya. Dicatat di sini supaya tidak dikira sudah berfungsi. |
| Pegawai | User biasa | Self assessment + lihat hasil sendiri |
| Atasan | Status berdasarkan relasi | Menilai bawahan + rekomendasi pelatihan |

Catatan: Relasi atasan-bawahan disimpan di data user (`supervisorId`), bukan role kaku.

## Prinsip Desain Utama
1. **Configurable First** — Hampir semua data (Unit, Jabatan, TUSI, Bank Soal, Standar Kompetensi, Leveling, Parameter) harus bisa diubah lewat Admin Panel tanpa coding ulang.
2. **Separation of Concerns** — Data master vs Logika bisnis dipisah dengan jelas.
3. **Dokumentasi Kuat** — Setiap perubahan penting dan keputusan harus dicatat di `konteks.md` agar bisa dilanjutkan AI agent lain.
4. **Security** — Firestore Security Rules ketat berdasarkan role + kepemilikan data.

## Modul Utama
Status per 19 Agustus 2026 — **SELESAI** berarti sudah dibangun, diuji lewat emulator, dan live di produksi. Detail masing-masing ada di `docs/konteks.md`.

1. Authentication & Role Management — **SELESAI** (email/password + Google, lupa password, verifikasi email, kontrol akses status pending/aktif/nonaktif + undangan mode tertutup)
2. Master Data (Unit Kerja hierarchical, Jabatan, Pangkat/Golongan) — **SELESAI**
3. Manajemen TUSI — **SELESAI**
4. Bank Soal / Kuesioner (dinamis berdasarkan TUSI/Kompetensi) — **SELESAI** untuk Bank Soal (likert/ya-tidak/pilihan ganda, manual + Impor berbantuan AI, Tong Sampah). Konsep "Kuesioner" sebagai entitas tersimpan (`questionnaires`) **TIDAK PERNAH dibangun** — soal dipilih otomatis saat runtime berdasarkan TUSI/kompetensi pegawai, bukan lewat kuesioner yang disusun admin terlebih dahulu. `collections.ts`/`firestore.rules` masih mendeklarasikan `questionnaires` tapi tidak ada kode yang memakainya — dibiarkan sebagai sisa rencana awal, bukan fitur aktif.
5. Standar Kompetensi & Leveling — **SELESAI**
6. Alur Self Assessment — **SELESAI**
7. Alur Penilaian Atasan + Rekomendasi Pelatihan — **SELESAI**
8. Rekap Usulan Pelatihan — **SELESAI**
9. Rekap & Dashboard TNA — **SELESAI** (gap dihitung per kompetensi per pegawai, bukan lagi agregat sederhana)
10. Admin Panel (sangat penting) — **SELESAI**
11. Parameter Sistem — **SELESAI**
12. Tes Pengetahuan (opsional, soal pilihan ganda) — **SELESAI**, dibangun setelah rencana awal ini ditulis. Hasilnya **tidak pernah** memengaruhi skor/gap kompetensi — murni kolom "Validasi Tes" terpisah untuk bahan pertimbangan atasan.
13. Segarkan Kunci Jawaban & Tong Sampah Soal (Bank Soal) — **SELESAI**, prosedur operasional + hard-delete terbatas untuk soal yang belum pernah dijawab.
14. Halaman Bantuan (`/bantuan`) — **SELESAI**, panduan pengguna per role + panduan setup awal untuk admin.

## Aturan Kerja AI Agent
- Selalu baca `docs/project.md` dan `docs/konteks.md` sebelum mulai mengerjakan tugas.
- Setiap selesai satu tahap, buat laporan singkat: apa yang dikerjakan, file yang diubah, keputusan penting, dan masalah yang muncul.
- Jangan mengubah arsitektur besar tanpa persetujuan.
- Utamakan solusi yang configurable dari Admin Panel.