"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStandarKompetensi,
  mapStandarKompetensiError,
} from "@/lib/services/standar-kompetensi";
import type { StandarKompetensi } from "@/types";

export function useStandarKompetensi(jabatanId: string | null) {
  const [item, setItem] = useState<StandarKompetensi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!jabatanId) {
      setItem(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setItem(await getStandarKompetensi(jabatanId));
    } catch (loadError) {
      setError(mapStandarKompetensiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [jabatanId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { item, loading, error, reload };
}
