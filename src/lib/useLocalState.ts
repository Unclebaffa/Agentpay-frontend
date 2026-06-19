"use client";

import { useState } from "react";

/**
 * useState backed by window.localStorage. SSR-safe — initial state is
 * the fallback until the hydration effect runs.
 */
export function useLocalState<T>(
  key: string,
  initial: T
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const write = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return [value, write];
}
