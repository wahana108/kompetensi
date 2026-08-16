"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useKompetensiList } from "@/hooks/use-kompetensi";
import { useKompetensiLevelList } from "@/hooks/use-kompetensi-level";
import { ADMIN_ROUTES } from "@/components/admin/nav";
import { KompetensiForm } from "@/components/admin/kompetensi-form";
import { buttonVariants } from "@/components/ui/button";

export default function EditKompetensiPage() {
  const params = useParams<{ id: string }>();
  const { profile } = useAuth();
  const kompetensi = useKompetensiList();
  const levels = useKompetensiLevelList();
  const item = kompetensi.items.find((entry) => entry.id === params.id);

  if (!profile) {
    return null;
  }

  if (kompetensi.loading || levels.loading) {
    return (
      <p className="text-sm text-muted-foreground">Memuat kompetensi...</p>
    );
  }

  if (kompetensi.error || levels.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {kompetensi.error ?? levels.error}
      </p>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Kompetensi tidak ditemukan. Mungkin sudah dihapus atau ID tidak valid.
        </p>
        <Link href={ADMIN_ROUTES.kompetensi} className={buttonVariants()}>
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <KompetensiForm
      mode="edit"
      actorId={profile.id}
      levels={levels.items}
      initial={item}
    />
  );
}
