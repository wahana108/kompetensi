"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth/errors";
import { isUsingFirebaseEmulator } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { configured, registerWithEmail, error: authError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const displayError = success ? null : (error ?? authError);

  async function handleRegister(formData: FormData) {
    setError(null);
    setSuccess(false);
    setPending(true);

    try {
      await registerWithEmail(
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? ""),
        String(formData.get("displayName") ?? "")
      );
      // Berhasil — AuthGate akan mengalihkan begitu profil baru terbaca
      // (ke /pending atau /dashboard). Pesan ini tampil sebentar di antara
      // waktu itu supaya pengguna tahu pendaftarannya jalan, bukan diam.
      setSuccess(true);
    } catch (registerError) {
      setError(mapAuthError(registerError));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daftar</CardTitle>
          <CardDescription>
            Akun baru mendapat role default <strong>pegawai</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!configured ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Firebase belum dikonfigurasi. Isi `.env.local` lalu restart
              server. Lihat `docs/SETUP-EMULATOR.md`.
            </p>
          ) : null}

          {configured && isUsingFirebaseEmulator() ? (
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Mode emulator. Jalankan `npm run emulators` sebelum daftar.
            </p>
          ) : null}

          {success ? (
            <p className="rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
              Pendaftaran berhasil! Mengalihkan...
            </p>
          ) : null}

          {displayError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </p>
          ) : null}

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRegister(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Nama</Label>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                disabled={!configured || pending || success}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={!configured || pending || success}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={!configured || pending || success}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!configured || pending}>
              {pending ? "Memproses..." : "Buat akun"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
