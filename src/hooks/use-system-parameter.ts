"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSystemParameters,
  mapSystemParameterError,
} from "@/lib/services/system-parameter";
import type { SystemParameters } from "@/types";

export function useSystemParameters() {
  const [item, setItem] = useState<SystemParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItem(await getSystemParameters());
    } catch (loadError) {
      setError(mapSystemParameterError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { item, loading, error, reload };
}
