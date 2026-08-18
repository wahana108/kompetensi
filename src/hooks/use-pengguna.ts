"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listPendingUsers,
  listPengguna,
  mapPenggunaError,
} from "@/lib/services/pengguna";
import type { UserProfile } from "@/types";

export function usePenggunaList() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listPengguna());
    } catch (loadError) {
      setError(mapPenggunaError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}

export function usePendingUserList() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listPendingUsers());
    } catch (loadError) {
      setError(mapPenggunaError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
