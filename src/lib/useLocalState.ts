"use client";

import { useEffect, useState } from "react";

export function useLocalState<T>(
  key: string,
  initial: T
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          setValue(JSON.parse(raw) as T);
        }
      } catch {
        setValue(initial);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initial, key]);

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
