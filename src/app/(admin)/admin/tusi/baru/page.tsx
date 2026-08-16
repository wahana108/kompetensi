"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useJabatanList } from "@/hooks/use-jabatan";
import { useUnitKerjaList } from "@/hooks/use-unit-kerja";
import { TusiForm } from "@/components/admin/tusi-form";

export default function NewTusiPage() {
  return (
    <Suspense fallback={<FormStatus>Memuat formulir...</FormStatus>}>
      <NewTusiForm />
    </Suspense>
  );
}

function NewTusiForm() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const units = useUnitKerjaList();
  const jabatan = useJabatanList();
  const requestedUnitId = searchParams.get("unitKerjaId");
  const defaultUnitKerjaId =
    requestedUnitId && units.units.some((unit) => unit.id === requestedUnitId)
      ? requestedUnitId
      : null;

  if (!profile) {
    return null;
  }

  if (units.loading || jabatan.loading) {
    return <FormStatus>Memuat data master...</FormStatus>;
  }

  if (units.error || jabatan.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {units.error ?? jabatan.error}
      </p>
    );
  }

  return (
    <TusiForm
      mode="create"
      actorId={profile.id}
      units={units.units}
      jabatan={jabatan.items}
      defaultUnitKerjaId={defaultUnitKerjaId}
    />
  );
}

function FormStatus({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
