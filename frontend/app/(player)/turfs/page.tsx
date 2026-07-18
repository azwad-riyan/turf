import { Suspense } from "react";
import { turfsApi } from "@/lib/api";
import TurfCard from "@/components/turf/TurfCard";
import TurfFilters from "@/components/turf/TurfFilters";
import type { Metadata } from "next";
import { TurfListItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Find Turf in Rajshahi — TurfBook",
  description: "Browse all available football, cricket, and volleyball turfs in Rajshahi. Filter by sport, area, and price.",
};

interface SearchParams {
  sport?: string;
  area?: string;
  min_price?: string;
  max_price?: string;
  search?: string;
  page?: string;
  [key: string]: string | undefined;
}

async function getTurfs(params: SearchParams): Promise<TurfListItem[]> {
  try {
    const queryParams: Record<string, string> = {};
    if (params.sport) queryParams.sport = params.sport;
    if (params.area) queryParams.area = params.area;
    if (params.min_price) queryParams.min_price = params.min_price;
    if (params.max_price) queryParams.max_price = params.max_price;
    if (params.search) queryParams.search = params.search;
    const res = await turfsApi.list(queryParams);
    return res.data.results || res.data;
  } catch {
    return [];
  }
}

const AREAS = ["Motihar", "Boalia", "Rajpara", "Shah Makhdum", "Paba", "Godagari"];

export default async function TurfListingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const turfs = await getTurfs(params);
  const activeSport = params.sport || "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          {activeSport ? `${activeSport.charAt(0).toUpperCase() + activeSport.slice(1)} Turfs` : "All Turfs"} in Rajshahi
        </h1>
        <p className="text-secondary-400">{turfs.length} turf{turfs.length !== 1 ? "s" : ""} found</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 shrink-0">
          <Suspense>
            <TurfFilters areas={AREAS} currentParams={params} />
          </Suspense>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {turfs.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">⚽</div>
              <h3 className="text-white font-semibold text-lg mb-2">No turfs found</h3>
              <p className="text-secondary-400 text-sm">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {turfs.map((turf) => (
                <TurfCard key={turf.id} turf={turf} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
