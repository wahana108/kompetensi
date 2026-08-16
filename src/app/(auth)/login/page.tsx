"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Memuat...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const { configured, signInWithEmail, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "inactive"
      ? "Akun dinonaktifkan. Hubungi admin."
      : null
  );
  const [pending, setPending] = useState(false);

  async function handleEmailLogin(formData: FormData) {
    setError(null);
    setPending(true);

    try {
      await signInWithEmail(
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? "")
      );
    } catch (loginError) {
      setError(mapAuthError(loginError));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setPending(true);

    try {
      await signInWithGoogle();
    } catch (loginError) {
      setError(mapAuthError(loginError));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>
            Sistem Penilaian Kompetensi Pegawai + TNA
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
              Mode emulator. Jalankan `npm run emulators` sebelum login.
              Panduan: `docs/SETUP-EMULATOR.md`.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleEmailLogin(new FormData(event.currentTarget));
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
                disabled={!configured || pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={!configured || pending}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!configured || pending}>
              {pending ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">atau</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!configured || pending}
            onClick={() => void handleGoogleLogin()}
          >
            Masuk dengan Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Daftar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
