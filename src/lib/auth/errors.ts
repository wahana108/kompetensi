const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Format email tidak valid.",
  "auth/user-disabled": "Akun ini dinonaktifkan.",
  "auth/user-not-found": "Email atau kata sandi salah.",
  "auth/wrong-password": "Email atau kata sandi salah.",
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/email-already-in-use": "Email sudah terdaftar.",
  "auth/weak-password": "Kata sandi minimal 6 karakter.",
  "auth/popup-closed-by-user": "Jendela masuk Google ditutup.",
  "auth/cancelled-popup-request": "Proses masuk Google dibatalkan.",
  "auth/operation-not-allowed": "Metode masuk ini belum diaktifkan di Firebase.",
  "auth/network-request-failed": "Gagal terhubung ke jaringan.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
  "auth/configuration-not-found": "Konfigurasi Firebase Auth belum lengkap.",
};

export function mapAuthError(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code];
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan. Coba lagi.";
}
