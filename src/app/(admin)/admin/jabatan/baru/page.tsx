"use client";

import { useAuth } from "@/hooks/use-auth";
import { JabatanForm } from "@/components/admin/jabatan-form";

export default function NewJabatanPage() {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  return <JabatanForm mode="create" actorId={profile.id} />;
}
