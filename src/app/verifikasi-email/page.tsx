"use client";

import { useEffect, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth/errors";
import { resendEmailVerification } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifikasiEmailPage() {
  const { profile, signOut, refreshEmailVerification } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    setResending(true);
    try {
      await resendEmailVerification();
      toast.success("Email verifikasi dikirim ulang.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setResending(false);
    }
  }

  async function handleCheckAgain() {
    setChecking(true);
    try {
      await refreshEmailVerification();
      // Kalau ternyata sudah terverifikasi, AuthGate yang membaca
      // emailVerified dari context ini akan otomatis memantulkan keluar
      // dari halaman ini (lihat requireVerifyEmailArea di guards.ts) —
      // halaman ini tidak perlu redirect manual.
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <CardTitle>Verifikasi Email Anda</CardTitle>
          </div>
          <CardDescription>
            Email verifikasi sudah dikirim ke{" "}
            {profile?.email ? <strong>{profile.email}</strong> : "akun Anda"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Buka email itu dan klik tautan verifikasinya, lalu kembali ke
            sini dan tekan &ldquo;Saya Sudah Verifikasi&rdquo;. Belum
            menerima email? Periksa folder spam, atau kirim ulang di bawah.
          </p>

          <Button
            type="button"
            className="w-full"
            disabled={checking}
            onClick={() => void handleCheckAgain()}
          >
            <RefreshCw className={checking ? "animate-spin" : ""} />
            {checking ? "Memeriksa..." : "Saya Sudah Verifikasi"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resending || cooldown > 0}
            onClick={() => void handleResend()}
          >
            {resending
              ? "Mengirim..."
              : cooldown > 0
                ? `Kirim Ulang (${cooldown}s)`
                : "Kirim Ulang Email Verifikasi"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => void signOut()}
          >
            Keluar
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
