"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
import { usePangkatList } from "@/hooks/use-pangkat";
import { usePenggunaList } from "@/hooks/use-pengguna";
import { useTusiList } from "@/hooks/use-tusi";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { PenggunaForm } from "@/components/admin/pengguna-form";
import { buttonVariants } from "@/components/ui/button";

export default function EditPenggunaPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const users = usePenggunaList();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const pangkat = usePangkatList();
  const tusi = useTusiList();
  const item = users.items.find((entry) => entry.id === params.id);

  if (!profile) {
    return null;
  }

  if (
    users.loading ||
    units.loading ||
    jabatan.loading ||
    pangkat.loading ||
    tusi.loading
  ) {
    return <p className="text-sm text-muted-foreground">Memuat pengguna...</p>;
  }

  if (users.error || units.error || jabatan.error || pangkat.error || tusi.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {users.error ?? units.error ?? jabatan.error ?? pangkat.error ?? tusi.error}
      </p>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pengguna tidak ditemukan. Mungkin belum punya profil atau ID tidak
          valid.
        </p>
        <Link href={ADMIN_ROUTES.pengguna} className={buttonVariants()}>
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <PenggunaForm
      actor={profile}
      users={users.items}
      units={units.units}
      jabatan={jabatan.items}
      pangkat={pangkat.items}
      tusi={tusi.items}
      initial={item}
    />
  );
}
