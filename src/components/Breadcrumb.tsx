import Link from "next/link";
import { type ReactNode } from "react";

type Crumb = { href?: string; label: ReactNode };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {c.href ? (
              <Link
                href={c.href}
                className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-zinc-900 dark:text-zinc-100">
                {c.label}
              </span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
