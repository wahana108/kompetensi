"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTnaPeriodSummaries,
  getTnaEmployeeDetails,
  mapTnaError,
  type TnaPeriodSummary,
  type TnaEmployeeDetail,
} from "@/lib/services/tna";

export function useTnaPeriodSummaries() {
  const [items, setItems] = useState<TnaPeriodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await getTnaPeriodSummaries());
    } catch (loadError) {
      setError(mapTnaError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}

export function useTnaEmployeeDetails(periodId: string) {
  const [items, setItems] = useState<TnaEmployeeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    setError(null);

    try {
      setItems(await getTnaEmployeeDetails(periodId));
    } catch (loadError) {
      setError(mapTnaError(loadError));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
