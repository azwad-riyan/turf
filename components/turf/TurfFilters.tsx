"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { clsx } from "clsx";

const SPORTS = [
  { value: "football", label: "⚽ Football" },
  { value: "cricket", label: "🏏 Cricket" },
  { value: "volleyball", label: "🏐 Volleyball" },
];

const PRICE_RANGES = [
  { label: "Under ৳2,000", min: "", max: "2000" },
  { label: "৳2,000–৳3,000", min: "2000", max: "3000" },
  { label: "৳3,000+", min: "3000", max: "" },
];

interface TurfFiltersProps {
  areas: string[];
  currentParams: Record<string, string | undefined>;
}

export default function TurfFilters({ areas, currentParams }: TurfFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(currentParams as Record<string, string>);
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/turfs?${params.toString()}`);
    },
    [router, currentParams]
  );

  const clearAll = () => router.push("/turfs");
  const hasFilters = Object.keys(currentParams).some((k) => currentParams[k]);

  return (
    <div className="card p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-white">
          <SlidersHorizontal className="w-4 h-4 text-primary-400" />
          Filters
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-secondary-400 hover:text-red-400 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Sport */}
      <div>
        <h3 className="label">Sport</h3>
        <div className="space-y-2">
          {SPORTS.map((s) => (
            <label key={s.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="sport"
                value={s.value}
                checked={currentParams.sport === s.value}
                onChange={() => updateFilter("sport", s.value)}
                className="w-4 h-4 accent-primary-600"
              />
              <span className="text-sm text-secondary-300 group-hover:text-white transition-colors">{s.label}</span>
            </label>
          ))}
          {currentParams.sport && (
            <button onClick={() => updateFilter("sport", "")} className="text-xs text-secondary-500 hover:text-primary-400">
              Clear sport
            </button>
          )}
        </div>
      </div>

      {/* Area */}
      <div>
        <h3 className="label">Area</h3>
        <select
          value={currentParams.area || ""}
          onChange={(e) => updateFilter("area", e.target.value)}
          className="input text-sm"
        >
          <option value="">All areas</option>
          {areas.map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="label">Price per Slot</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => {
            const active = currentParams.min_price === range.min && currentParams.max_price === range.max;
            return (
              <button
                key={range.label}
                onClick={() => {
                  if (active) {
                    updateFilter("min_price", "");
                    updateFilter("max_price", "");
                  } else {
                    const p = new URLSearchParams(currentParams as Record<string, string>);
                    range.min ? p.set("min_price", range.min) : p.delete("min_price");
                    range.max ? p.set("max_price", range.max) : p.delete("max_price");
                    router.push(`/turfs?${p.toString()}`);
                  }
                }}
                className={clsx(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors",
                  active
                    ? "bg-primary-900/40 text-primary-400 border border-primary-800"
                    : "text-secondary-400 hover:bg-secondary-800 hover:text-white"
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
