# Project: Sistem Penilaian Kompetensi Pegawai + TNA

## Visi
Membangun web application untuk proses **Penilaian Kompetensi Pegawai** yang berujung pada **Training Needs Analysis (TNA)**. Sistem harus fleksibel, configurable dari Admin Panel, dan tidak memerlukan coding ulang untuk perubahan data master, soal, TUSI, standar kompetensi, maupun parameter penilaian.

## Referensi Utama
Diagram Bisnis Proses: BISNIS PROSES PENILAIAN KOMPETENSI PEGAWAI
Alur: Identitas Responden → Tempat Tugas → TUSI → Kuesioner Penilaian Diri → Penilaian Kompetensi Individu (Self + Atasan + Rekomendasi) → Rekap Usulan Pelatihan → Rekap TNA

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Auth**: Firebase Authentication (Google + Email/Password)
- **Database**: Cloud Firestore
- **Backend Logic**: Firebase Cloud Functions (Node.js)
- **Hosting**: Vercel (Frontend) + Firebase
- **Development**: VSCode + Firebase Emulator + Grok CLI / Gemini CLI

## Role System
| Role | Keterangan | Akses Utama |
|------|----------|-------------|
| Super Admin | Admin utama | Semua akses + menunjuk Admin/Moderator + pengaturan sistem |
| Admin | Ditunjuk Super Admin | Kelola master data, soal, TUSI, standar, monitoring |
| Moderator | Opsional | Monitoring & validasi hasil |
| Pegawai | User biasa | Self assessment + lihat hasil sendiri |
| Atasan | Status berdasarkan relasi | Menilai bawahan + rekomendasi pelatihan |

Catatan: Relasi atasan-bawahan disimpan di data user (`supervisorId`), bukan role kaku.

## Prinsip Desain Utama
1. **Configurable First** — Hampir semua data (Unit, Jabatan, TUSI, Bank Soal, Standar Kompetensi, Leveling, Parameter) harus bisa diubah lewat Admin Panel tanpa coding ulang.
2. **Separation of Concerns** — Data master vs Logika bisnis dipisah dengan jelas.
3. **Dokumentasi Kuat** — Setiap perubahan penting dan keputusan harus dicatat di `konteks.md` agar bisa dilanjutkan AI agent lain (Grok CLI / Gemini CLI).
4. **Security** — Firestore Security Rules ketat berdasarkan role + kepemilikan data.

## Modul Utama
1. Authentication & Role Management
2. Master Data (Unit Kerja hierarchical, Jabatan, Pangkat/Golongan)
3. Manajemen TUSI
4. Bank Soal / Kuesioner (dinamis berdasarkan TUSI/Kompetensi)
5. Standar Kompetensi & Leveling
6. Alur Self Assessment
7. Alur Penilaian Atasan + Rekomendasi Pelatihan
8. Rekap Usulan Pelatihan
9. Rekap & Dashboard TNA
10. Admin Panel (sangat penting)
11. Parameter Sistem

## Aturan Kerja AI Agent
- Selalu baca `docs/project.md` dan `docs/konteks.md` sebelum mulai mengerjakan tugas.
- Setiap selesai satu tahap, buat laporan singkat: apa yang dikerjakan, file yang diubah, keputusan penting, dan masalah yang muncul.
- Jangan mengubah arsitektur besar tanpa persetujuan.
- Utamakan solusi yang configurable dari Admin Panel.