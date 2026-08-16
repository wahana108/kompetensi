"use client";

import { useAuth } from "@/hooks/use-auth";
import { PeriodeForm } from "@/components/admin/periode-form";

export default function NewPeriodePage() {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  return <PeriodeForm mode="create" actorId={profile.id} />;
}
