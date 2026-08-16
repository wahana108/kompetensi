"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listKompetensiLevels,
  mapKompetensiLevelError,
} from "@/lib/services/kompetensi-level";
import type { KompetensiLevel } from "@/types";

export function useKompetensiLevelList() {
  const [items, setItems] = useState<KompetensiLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listKompetensiLevels());
    } catch (loadError) {
      setError(mapKompetensiLevelError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
