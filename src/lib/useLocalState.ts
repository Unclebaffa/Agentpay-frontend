"use client";

import { useEffect, useState } from "react";

export function useLocalState<T>(
  key: string,
  initial: T
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);

  // Read from localStorage after mount only — keeps SSR output deterministic
  // and avoids calling localStorage during renderToString.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore invalid JSON */
    }
  }, [key]);

  const write = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  return [value, write];
}
