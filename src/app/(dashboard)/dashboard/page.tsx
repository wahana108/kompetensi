"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useHasSubordinates } from "@/hooks/use-subordinates";
import { canAccessAdmin, getRoleLabel, hasSupervisor } from "@/lib/auth/roles";
import { DASHBOARD_ROUTES } from "@/components/dashboard/nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { profile } = useAuth();
  const hasSubordinates = useHasSubordinates(profile?.id);

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Halo, {profile.displayName}</CardTitle>
          <CardDescription>
            Isi penilaian diri pada periode yang sedang aktif. Soal dipilih
            berdasarkan TUSI yang Anda ampu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getRoleLabel(profile.role)}</Badge>
            <span className="text-muted-foreground">{profile.email}</span>
          </div>
          <p>
            <span className="text-muted-foreground">Punya atasan:</span>{" "}
            {hasSupervisor(profile) ? "ya" : "belum diatur"}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={DASHBOARD_ROUTES.penilaian} className={buttonVariants()}>
              Buka penilaian diri
            </Link>
            {hasSubordinates ? (
              <Link
                href={DASHBOARD_ROUTES.penilaianAtasan}
                className={buttonVariants({ variant: "outline" })}
              >
                Nilai bawahan
              </Link>
            ) : null}
            {canAccessAdmin(profile.role) ? (
              <Link
                href="/admin"
                className={buttonVariants({ variant: "outline" })}
              >
                Area admin
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
