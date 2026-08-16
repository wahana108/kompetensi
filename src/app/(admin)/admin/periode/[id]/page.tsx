"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentPeriodList } from "@/hooks/use-assessment-period";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { PeriodeForm } from "@/components/admin/periode-form";
import { buttonVariants } from "@/components/ui/button";

export default function EditPeriodePage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { items, loading, error } = useAssessmentPeriodList();
  const item = items.find((entry) => entry.id === params.id);

  if (!profile) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat periode...</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Periode tidak ditemukan. Mungkin sudah dihapus atau ID tidak valid.
        </p>
        <Link href={ADMIN_ROUTES.periode} className={buttonVariants()}>
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return <PeriodeForm mode="edit" actorId={profile.id} initial={item} />;
}
