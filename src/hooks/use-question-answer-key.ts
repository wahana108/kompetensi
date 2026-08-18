"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listQuestionAnswerKeys,
  mapQuestionAnswerKeyError,
} from "@/lib/services/question-answer-key";
import type { QuestionAnswerKey } from "@/types";

export function useQuestionAnswerKeyList() {
  const [items, setItems] = useState<QuestionAnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await listQuestionAnswerKeys());
    } catch (loadError) {
      setError(mapQuestionAnswerKeyError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
