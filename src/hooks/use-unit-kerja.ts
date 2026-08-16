"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listUnitKerja,
  mapUnitKerjaError,
} from "@/lib/services/unit-kerja";
import type { UnitKerja } from "@/types";

export function useUnitKerjaList() {
  const [units, setUnits] = useState<UnitKerja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setUnits(await listUnitKerja());
    } catch (loadError) {
      setError(mapUnitKerjaError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { units, loading, error, reload };
}
