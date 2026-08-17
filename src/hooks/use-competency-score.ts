"use client";

import { useCallback, useEffect, useState } from "react";
import { computeEmployeeCompetencyScores } from "@/lib/services/competency-score";
import type { CompetencyScore, UserProfile } from "@/types";

export function useEmployeeCompetencyScores(
  periodId: string | null,
  employee: UserProfile | null
) {
  const [items, setItems] = useState<CompetencyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!periodId || !employee) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setItems(await computeEmployeeCompetencyScores(periodId, employee));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal menghitung analisis gap kompetensi."
      );
    } finally {
      setLoading(false);
    }
  }, [periodId, employee]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
