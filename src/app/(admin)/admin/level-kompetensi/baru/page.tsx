"use client";

import { useAuth } from "@/hooks/use-auth";
import { useKompetensiLevelList } from "@/hooks/use-kompetensi-level";
import { KompetensiLevelForm } from "@/components/admin/kompetensi-level-form";

export default function NewKompetensiLevelPage() {
  const { profile } = useAuth();
  const { items, loading, error } = useKompetensiLevelList();

  if (!profile) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat level...</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  const defaultLevel =
    items.length === 0 ? 1 : Math.max(...items.map((item) => item.level)) + 1;

  return (
    <KompetensiLevelForm
      mode="create"
      actorId={profile.id}
      defaultLevel={defaultLevel}
    />
  );
}
