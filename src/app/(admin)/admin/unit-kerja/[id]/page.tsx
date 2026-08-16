"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { UnitKerjaForm } from "@/components/admin/unit-kerja-form";
import { buttonVariants } from "@/components/ui/button";

export default function EditUnitKerjaPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { units, loading, error } = useUnitKerjaList();
  const unit = units.find((item) => item.id === params.id);

  if (!profile) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat unit kerja...</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!unit) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Unit kerja tidak ditemukan. Mungkin sudah dihapus atau ID tidak valid.
        </p>
        <Link href={ADMIN_ROUTES.unitKerja} className={buttonVariants()}>
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <UnitKerjaForm
      mode="edit"
      units={units}
      actorId={profile.id}
      initial={unit}
    />
  );
}
