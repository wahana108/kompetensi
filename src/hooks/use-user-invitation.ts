"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listInvitations,
  mapUserInvitationError,
} from "@/lib/services/user-invitation";
import type { UserInvitation } from "@/types";

export function useInvitationList() {
  const [items, setItems] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listInvitations());
    } catch (loadError) {
      setError(mapUserInvitationError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
