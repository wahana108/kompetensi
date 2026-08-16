"use client";

import { useAuth } from "@/hooks/use-auth";
import { useKompetensiLevelList } from "@/hooks/use-kompetensi-level";
import { KompetensiForm } from "@/components/admin/kompetensi-form";

export default function NewKompetensiPage() {
  const { profile } = useAuth();
  const { items, loading, error } = useKompetensiLevelList();

  if (!profile) {
    return null;
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Memuat level kompetensi...</p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <KompetensiForm mode="create" actorId={profile.id} levels={items} />
  );
}
