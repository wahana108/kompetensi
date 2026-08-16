"use client";

import { useCallback, useEffect, useState } from "react";
import { listQuestions, mapQuestionError } from "@/lib/services/question";
import type { Question } from "@/types";

export function useQuestionList() {
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listQuestions());
    } catch (loadError) {
      setError(mapQuestionError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
