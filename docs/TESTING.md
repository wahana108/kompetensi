# Cara Menguji `firestore.rules`

Tidak ada test runner otomatis di project ini (lihat Utang Teknis #5 di `docs/konteks.md`). Verifikasi rules dilakukan lewat skrip `tsx` sekali-pakai terhadap Firebase Emulator, **dihapus setelah dipakai** — pola di bawah ini dipakai berulang kali sepanjang pengembangan, tulis ulang skripnya tiap kali, jangan biarkan menumpuk di repo.

## Client SDK vs Admin SDK — jangan tertukar

- **Client SDK (`firebase/firestore`, `firebase/auth`) untuk SEMUA asersi keamanan.** Sign in sungguhan sebagai akun uji, lalu coba baca/tulis — ini satu-satunya cara yang benar-benar melewati `firestore.rules`, karena itu memang jalur yang dipakai aplikasi sungguhan.
- **Admin SDK (`firebase-admin`) HANYA untuk menyiapkan fixture** (buat user, tulis dokumen dengan bentuk field yang presisi terkontrol) — Admin SDK **melewati rules sepenuhnya**. Sebuah write yang berhasil lewat Admin SDK **tidak membuktikan apa pun** soal rules; kalau assersi keamanan memakai Admin SDK, hasilnya selalu "berhasil" terlepas dari isi rules-nya.

## Pola: fixture → uji → bersihkan → reseed

1. Admin SDK: buat data yang tidak bisa dibuat lewat alur UI normal (mis. dokumen undangan tanpa field `usedAt` sama sekali — `createInvitation()` klien selalu menulis `null` eksplisit, jadi kasus "field tidak ada" cuma bisa dibuat lewat Admin SDK).
2. Client SDK: sign in sebagai akun uji, jalankan operasi yang mau diuji, cek hasilnya `permission-denied` atau berhasil sesuai harapan.
3. Hapus akun Auth + dokumen uji yang dibuat (Admin SDK).
4. `npx tsx scripts/seed-dev.ts` untuk kembalikan emulator ke state bersih.
5. Hapus skrip uji sementara — jangan commit ke repo.

## Fake-IdP Auth Emulator — menguji klaim Google tanpa OAuth sungguhan

`signInWithPopup` tidak bisa discript. Untuk menguji perilaku Google (mis. `email_verified`), pakai `GoogleAuthProvider.credential()` dengan fake ID token berbentuk JSON (bukan JWT asli — emulator menerimanya apa adanya):
```ts
const fakeIdToken = JSON.stringify({ sub: "uid", email: "x@gmail.com", email_verified: true, name: "..." });
await signInWithCredential(auth, GoogleAuthProvider.credential(fakeIdToken));
```
Ini menjalankan jalur kode `signInWithIdp` yang SAMA seperti popup asli — bukti empiris, bukan asumsi dari dokumentasi.

## Wajib diulang setiap kali `firestore.rules` disentuh

**4 uji kunci jawaban** (`question_answer_keys` / `test_sessions`):
- (a) belum submit test_sessions → baca kunci **ditolak**
- (b) sudah submit periode aktif → baca kunci **berhasil**
- (c) kunci milik periode LAIN → **ditolak** (gerbang per-periode, bukan sekali-buka-selamanya)
- (d) `skorPerKompetensi` yang sudah terisi → update **ditolak** (skor sekali-tulis)

**Gerbang status akun** (`userExists()`):
- akun `aktif` + email terverifikasi → akses penuh sesuai role
- akun terverifikasi tapi `status: pending` → tetap **ditolak** (pending menang atas emailVerified)
- akun `aktif` + role admin tapi **belum** verifikasi email → **ditolak** (baru sejak fitur verifikasi email)

## Peringatan dari pengalaman nyata: alur Auth WAJIB diuji lewat browser

Skrip `tsx` **tidak me-mount `AuthProvider`/`AuthGate`** — ia memanggil `registerWithEmail()`/`signInWithGoogle()` langsung. Bug race condition registrasi (dua penulis balapan membuat `users/{uid}` yang sama, lihat `docs/konteks.md`) **lolos dari semua uji `tsx`** karena skenarionya cuma muncul saat `onAuthStateChanged` di `AuthProvider` bereaksi bersamaan dengan `registerWithEmail()` — kondisi yang cuma terjadi di browser sungguhan, tidak pernah di skrip Node. **Perubahan apa pun di `session.ts`/`auth-provider.tsx`/`auth-gate.tsx` wajib diklik manual di browser** (via `npm run dev` + emulator), tidak cukup lolos skrip `tsx`.

---
Ditautkan dari `README.md`. Lihat `docs/konteks.md` untuk hasil pengujian aktual tiap fitur.
