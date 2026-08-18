"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PendingPage() {
  const { profile, signOut } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-green-600" />
            <CardTitle>Pendaftaran Berhasil</CardTitle>
          </div>
          <CardDescription>
            Akun {profile?.email ? <strong>{profile.email}</strong> : "Anda"}{" "}
            sudah dibuat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-2 rounded-md border border-amber-600/30 bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <p>
              Menunggu persetujuan admin. Akses ke sistem baru aktif setelah
              admin memeriksa dan menyetujui pendaftaran ini.
            </p>
          </div>
          <p className="text-muted-foreground">
            Silakan hubungi admin jika sudah menunggu lama.
          </p>
          <Button
            type="button"
            variant="outline"
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
