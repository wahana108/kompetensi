"use client";

import { useCallback, useEffect, useState } from "react";
import {
  computeEmployeeCompetencyScores,
  type CompetencyScoreWeights,
} from "@/lib/services/competency-score";
import type { CompetencyScore, UserProfile } from "@/types";

/**
 * `weights` sebaiknya di-memoize oleh pemanggil (mis. lewat useMemo) —
 * object baru di setiap render akan memicu reload berulang lewat effect
 * di bawah.
 */
export function useEmployeeCompetencyScores(
  periodId: string | null,
  employee: UserProfile | null,
  weights?: CompetencyScoreWeights
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
      setItems(await computeEmployeeCompetencyScores(periodId, employee, weights));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal menghitung analisis gap kompetensi."
      );
    } finally {
      setLoading(false);
    }
  }, [periodId, employee, weights]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
