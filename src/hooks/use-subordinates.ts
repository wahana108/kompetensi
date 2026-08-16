"use client";

import { useEffect, useState } from "react";
import { listSubordinates } from "@/lib/services/pengguna";

export function useHasSubordinates(userId: string | undefined) {
  const [hasSubordinates, setHasSubordinates] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasSubordinates(false);
      return;
    }

    let cancelled = false;

    void listSubordinates(userId)
      .then((items) => {
        if (!cancelled) {
          setHasSubordinates(items.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasSubordinates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return hasSubordinates;
}
