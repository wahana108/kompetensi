"use client";

import { useState } from "react";
import Link from "next/link";
import { mapAuthError } from "@/lib/auth/errors";
import { sendPasswordReset } from "@/lib/auth/session";
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

const GENERIC_SENT_MESSAGE =
  "Kalau email itu terdaftar, tautan reset kata sandi sudah dikirim. Periksa kotak masuk (dan folder spam).";

export default function LupaPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);

    const email = String(formData.get("email") ?? "");

    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      // "auth/user-not-found" TIDAK ditampilkan sebagai error — kalau
      // dibedakan dari sukses, halaman ini bisa dipakai menebak email
      // mana yang punya akun. Kesalahan lain (format email, jaringan,
      // rate limit) tetap ditampilkan apa adanya karena itu soal input
      // yang baru diketik, bukan soal akun orang lain.
      if (
        typeof resetError === "object" &&
        resetError &&
        "code" in resetError &&
        (resetError as { code: string }).code === "auth/user-not-found"
      ) {
        setSent(true);
      } else {
        setError(mapAuthError(resetError));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Lupa Kata Sandi</CardTitle>
          <CardDescription>
            Masukkan email akun Anda — kami kirim tautan untuk membuat kata
            sandi baru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUsingFirebaseEmulator() ? (
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Mode emulator. Tautan reset dikirim ke Emulator UI Auth
              (bukan email sungguhan) — lihat{" "}
              <span className="font-mono">http://127.0.0.1:4000/auth</span>.
            </p>
          ) : null}

          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Hanya berlaku untuk akun yang mendaftar dengan email + kata
            sandi. Kalau Anda masuk memakai tombol <b>Masuk dengan Google</b>
            , akun itu tidak punya kata sandi di sistem ini — atur ulang
            lewat akun Google Anda sendiri, bukan di halaman ini.
          </p>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {sent ? (
            <p className="rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {GENERIC_SENT_MESSAGE}
            </p>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit(new FormData(event.currentTarget));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={pending}
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Mengirim..." : "Kirim Tautan Reset"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Kembali ke halaman masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
