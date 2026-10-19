"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicEvent } from "@/lib/public/types";
import { GROUPS, type GroupKey } from "@/lib/site";
import { EventCard } from "./event-card";

type Filter = "all" | GroupKey;

export function PortfolioGrid({ events }: { events: PublicEvent[] }) {
  const initial = useSearchParams().get("type");
  const [filter, setFilter] = useState<Filter>(initial === "wedding" || initial === "corporate" ? initial : "all");
  const shown =
    filter === "all" ? events : events.filter((e) => (GROUPS[filter].categories as readonly string[]).includes(e.category));
  const tabs: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, ...Object.entries(GROUPS).map(([key, g]) => ({ key: key as GroupKey, label: g.label }))];

  return (
    <>
      <div role="group" aria-label="Filter events" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={filter === t.key}
            onClick={() => setFilter(t.key)}
            className={`min-h-11 rounded-full border px-5 font-semibold ${
              filter === t.key ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:border-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-10 text-lg text-muted">No events in this group yet. Please check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </>
  );
}
