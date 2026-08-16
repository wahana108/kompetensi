"use client";

import { useCallback, useEffect, useState } from "react";
import { listTusi, mapTusiError } from "@/lib/services/tusi";
import type { Tusi } from "@/types";

export function useTusiList() {
  const [items, setItems] = useState<Tusi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listTusi());
    } catch (loadError) {
      setError(mapTusiError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
