"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { UnitKerjaForm } from "@/components/admin/unit-kerja-form";

export default function NewUnitKerjaPage() {
  return (
    <Suspense fallback={<FormStatus>Memuat formulir...</FormStatus>}>
      <NewUnitKerjaForm />
    </Suspense>
  );
}

function NewUnitKerjaForm() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { units, loading, error } = useUnitKerjaList();
  const requestedParentId = searchParams.get("parentId");
  const defaultParentId =
    requestedParentId && units.some((unit) => unit.id === requestedParentId)
      ? requestedParentId
      : null;

  if (!profile) {
    return null;
  }

  if (loading) {
    return <FormStatus>Memuat unit kerja...</FormStatus>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <UnitKerjaForm
      mode="create"
      units={units}
      actorId={profile.id}
      defaultParentId={defaultParentId}
    />
  );
}

function FormStatus({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
