"use client";

import { useCallback, useEffect, useState } from "react";
import { listKompetensi, mapKompetensiError } from "@/lib/services/kompetensi";
import type { Kompetensi } from "@/types";

export function useKompetensiList() {
  const [items, setItems] = useState<Kompetensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listKompetensi());
    } catch (loadError) {
      setError(mapKompetensiError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
