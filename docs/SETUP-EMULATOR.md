# Setup Firebase Emulator (Auth + Firestore)

Panduan singkat agar Authentication bisa ditest secara lokal. Tidak perlu project Firebase production.

## Prasyarat

- Node.js 20+
- Java 17+ (wajib untuk Firestore Emulator)
- Di folder project `C:\tna-kompetensi`

Cek Java:

```powershell
java -version
```

Jika Java belum ada, install JDK 17 atau lebih baru, lalu buka ulang terminal.

## 1. Isi `.env.local`

```powershell
copy .env.local.example .env.local
```

Untuk emulator, nilai dummy di example sudah cukup. Yang penting:

| Variabel | Nilai emulator |
|----------|----------------|
| `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` | `true` |
| `FIREBASE_ADMIN_USE_EMULATOR` | `true` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `demo-tna-kompetensi` |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` |
| `FIRESTORE_EMULATOR_HOST` | `127.0.0.1:8080` |

`apiKey`, `authDomain`, dan `appId` boleh dummy. Jangan pakai project id production saat flag emulator `true`.

Setelah mengubah `.env.local`, restart `npm run dev`.

## 2. Jalankan emulator

Buka **dua terminal** di folder project.

Terminal 1 — Auth + Firestore + Emulator UI:

```powershell
npm run emulators
```

Tunggu sampai muncul:

- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Emulator UI: `http://127.0.0.1:4000`

Terminal 2 — aplikasi Next.js:

```powershell
npm run dev
```

Buka `http://localhost:3000` (akan diarahkan ke `/login`).

`npm run emulators:all` jangan dipakai dulu — folder Cloud Functions belum ada.

## 3. Tes login

### Email / password

1. Buka `/register`.
2. Isi nama, email (contoh `pegawai@example.com`), kata sandi minimal 6 karakter.
3. Submit. Akun dibuat di Auth Emulator, dokumen `users/{uid}` dibuat di Firestore dengan role `pegawai`.
4. Seharusnya masuk ke `/dashboard`.
5. Keluar, lalu tes `/login` dengan email/password yang sama.

User emulator juga bisa dibuat lewat `http://127.0.0.1:4000` → Authentication → Add user, lalu login di aplikasi.

### Google

1. Pastikan emulator Auth sudah jalan dan banner "Mode emulator" terlihat di `/login`.
2. Klik **Masuk dengan Google**.
3. Emulator membuka jendela **bukan** Google sungguhan. Isi email fiktif, misalnya `google.user@example.com`.
4. Akun + dokumen `users/{uid}` terbuat dengan role `pegawai`.

Jika popup error, pastikan `npm run emulators` masih berjalan dan `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`.

## 4. Jadikan Super Admin pertama

1. Login sekali agar dokumen `users/{uid}` ada.
2. Buka `http://127.0.0.1:4000` → Firestore → collection `users` → dokumen uid tersebut.
3. Ubah field `role` dari `pegawai` menjadi `super_admin`.
4. Logout di aplikasi, lalu login lagi.
5. Seharusnya masuk ke `/admin` (halaman placeholder, bukan Admin Panel).

Jangan ubah `role` dari client. Firestore rules menolak user mengubah role sendiri.

## Port

| Layanan | Alamat |
|---------|--------|
| Next.js | `http://localhost:3000` |
| Emulator UI | `http://127.0.0.1:4000` |
| Auth | `127.0.0.1:9099` |
| Firestore | `127.0.0.1:8080` |

## Masalah umum

- **Java tidak ketemu** — Firestore emulator gagal start. Install JDK, restart terminal.
- **Port sudah dipakai** — hentikan proses di 4000/8080/9099, atau ubah port di `firebase.json` dan `.env.local` secara bersamaan.
- **Login bilang Firebase belum dikonfigurasi** — `.env.local` belum ada / flag emulator bukan `true`. Restart `npm run dev`.
- **Request ke `googleapis` / project production** — emulator tidak tersambung. Cek flag env dan pastikan `npm run emulators` hidup sebelum buka browser.
- **Data hilang setelah emulator di-stop** — normal. Emulator tidak menyimpan data kecuali memakai `--export-on-exit` (belum diaktifkan).
