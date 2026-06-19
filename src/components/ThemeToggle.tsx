"use client";

import { useEffect, useState } from "react";
import { readTheme, writeTheme, effectiveTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveTheme(theme) === "dark");
  }, [theme]);

  const set = (next: Theme) => {
    setTheme(next);
    writeTheme(next);
  };

  return (
    <div role="group" aria-label="Theme" className="inline-flex gap-1 rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
      {(["light", "dark", "system"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => set(t)}
          aria-pressed={theme === t}
          className={`rounded-full px-3 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            theme === t ? "bg-zinc-200 dark:bg-zinc-800" : ""
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
