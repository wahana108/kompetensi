"use client";

import { useCallback, useEffect, useState } from "react";
import { listPangkat, mapPangkatError } from "@/lib/services/pangkat";
import type { Pangkat } from "@/types";

export function usePangkatList() {
  const [items, setItems] = useState<Pangkat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listPangkat());
    } catch (loadError) {
      setError(mapPangkatError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
