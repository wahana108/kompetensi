"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePangkatList } from "@/hooks/use-pangkat";
import { PangkatForm } from "@/components/admin/pangkat-form";
import { nextPangkatSortOrder } from "@/lib/services/pangkat";

export default function NewPangkatPage() {
  const { profile } = useAuth();
  const { items, loading, error } = usePangkatList();

  if (!profile) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat pangkat...</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <PangkatForm
      mode="create"
      actorId={profile.id}
      defaultSortOrder={nextPangkatSortOrder(items)}
    />
  );
}
