"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTestSession,
  listTestSessionsForPeriod,
  mapTestSessionError,
} from "@/lib/services/test-session";
import type { TestSession } from "@/types";

export function useTestSession(
  employeeId: string | null,
  periodId: string | null
) {
  const [item, setItem] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!employeeId || !periodId) {
      setItem(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setItem(await getTestSession(employeeId, periodId));
    } catch (loadError) {
      setError(mapTestSessionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [employeeId, periodId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { item, loading, error, reload };
}

export function useTestSessionsForPeriod(periodId: string | null) {
  const [items, setItems] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!periodId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setItems(await listTestSessionsForPeriod(periodId));
    } catch (loadError) {
      setError(mapTestSessionError(loadError));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
