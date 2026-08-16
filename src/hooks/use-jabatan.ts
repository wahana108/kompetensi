"use client";

import { useCallback, useEffect, useState } from "react";
import { listJabatan, mapJabatanError } from "@/lib/services/jabatan";
import type { Jabatan } from "@/types";

export function useJabatanList() {
  const [items, setItems] = useState<Jabatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listJabatan());
    } catch (loadError) {
      setError(mapJabatanError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
