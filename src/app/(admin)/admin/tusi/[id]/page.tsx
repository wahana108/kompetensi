"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
import { useTusiList } from "@/hooks/use-tusi";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { TusiForm } from "@/components/admin/tusi-form";
import { buttonVariants } from "@/components/ui/button";

export default function EditTusiPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const tusi = useTusiList();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const item = tusi.items.find((entry) => entry.id === params.id);

  if (!profile) {
    return null;
  }

  if (tusi.loading || units.loading || jabatan.loading) {
    return <p className="text-sm text-muted-foreground">Memuat TUSI...</p>;
  }

  if (tusi.error || units.error || jabatan.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {tusi.error ?? units.error ?? jabatan.error}
      </p>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          TUSI tidak ditemukan. Mungkin sudah dihapus atau ID tidak valid.
        </p>
        <Link href={ADMIN_ROUTES.tusi} className={buttonVariants()}>
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <TusiForm
      mode="edit"
      actorId={profile.id}
      units={units.units}
      jabatan={jabatan.items}
      initial={item}
    />
  );
}
