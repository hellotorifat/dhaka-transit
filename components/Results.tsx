"use client";

import type { PlanResponse } from "@/lib/types";

const ICON = { walk: "🚶", rickshaw: "🛺", bus: "🚌" } as const;

type Props = {
  data: PlanResponse;
  selected: number;
  onSelect: (i: number) => void;
};

export default function Results({ data, selected, onSelect }: Props) {
  if (data.options.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        {data.message ?? "No route found."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.options.map((o, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={`w-full rounded-xl border p-3 text-left transition ${
            i === selected ? "border-green-600 bg-green-50" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold">{o.total_minutes} min</span>
            <span className="font-medium">৳{o.total_fare_bdt}</span>
          </div>
          <ol className="mt-2 space-y-2 text-sm">
            {o.legs.map((l, j) => (
              <li key={j} className="flex gap-2">
                <span>{ICON[l.type]}</span>
                <span className="min-w-0 flex-1">
                  {l.title}
                  <span className="block truncate text-xs text-gray-500">
                    {l.from} → {l.to}
                  </span>
                </span>
                <span className="whitespace-nowrap text-xs text-gray-600">
                  {l.minutes} min
                  {l.fare_bdt > 0 && ` · ৳${l.fare_bdt}${l.estimated ? "~" : ""}`}
                </span>
              </li>
            ))}
          </ol>
        </button>
      ))}
      <p className="text-xs text-gray-500">
        Times and rickshaw fares (~) are estimates. Bus fares come from the database.
      </p>
    </div>
  );
}
