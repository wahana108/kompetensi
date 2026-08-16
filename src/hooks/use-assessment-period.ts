"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAssessmentPeriods,
  mapPeriodError,
} from "@/lib/services/assessment-period";
import type { AssessmentPeriod } from "@/types";

export function useAssessmentPeriodList() {
  const [items, setItems] = useState<AssessmentPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listAssessmentPeriods());
    } catch (loadError) {
      setError(mapPeriodError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
