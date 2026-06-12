import { type ReactNode } from "react";

type Props = {
  label: ReactNode;
  value: ReactNode;
  trend?: { delta: number; positiveIsGood?: boolean };
};

export function StatTile({ label, value, trend }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-800">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      {trend && (
        <p
          className={`mt-1 text-xs ${
            (trend.delta > 0 ? trend.positiveIsGood !== false : trend.positiveIsGood === false)
              ? "text-emerald-700"
              : "text-rose-700"
          }`}
        >
          {trend.delta > 0 ? "+" : ""}
          {trend.delta}
        </p>
      )}
    </div>
  );
}
