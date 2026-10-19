"use client";

import Link from "next/link";
import { useApi } from "./use-api";
import { useMe } from "./shell";
import { QuickContact } from "./leads";
import { CATEGORY_LABELS, EmptyState, ErrorBlock, LinkButton, LoadingBlock, PageHeader, Panel, StatusPill, timeAgo } from "./ui";
import type { EventRecord, LeadRecord } from "./types";

function greeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Count({ path }: { path: string }) {
  const { meta, loading } = useApi<unknown[]>(path);
  return <span className="font-display text-2xl font-semibold tabular-nums text-ink">{loading ? "…" : (meta?.total ?? 0)}</span>;
}

export function Dashboard() {
  const me = useMe();
  const waiting = useApi<LeadRecord[]>("/api/admin/leads?status=new&limit=5");
  const drafts = useApi<EventRecord[]>("/api/admin/events?status=draft&limit=1");

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}, ${me.name.split(" ")[0]}`}
        description="Here is what needs your attention today."
        actions={
          <LinkButton href="/admin/events/new" variant="primary">
            Add event
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel
          title="Enquiries waiting for a reply"
          description={waiting.meta?.total ? `${waiting.meta.total} new, newest first` : undefined}
        >
          {waiting.error ? (
            <ErrorBlock message={waiting.error} onRetry={waiting.reload} />
          ) : waiting.loading ? (
            <LoadingBlock />
          ) : !waiting.data?.length ? (
            <EmptyState title="You are all caught up" description="New enquiries from the website will appear here." />
          ) : (
            <>
              <ul className="-my-2 divide-y divide-line">
                {waiting.data.map((lead) => (
                  <li key={lead._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                    <Link href="/admin/leads" className="min-w-0 flex-1 basis-52">
                      <span className="block font-semibold text-ink">{lead.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {CATEGORY_LABELS[lead.eventType] ?? lead.eventType}
                        {lead.city ? `, ${lead.city}` : ""}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <StatusPill status={lead.status} />
                        <span className="text-xs text-muted">{timeAgo(lead.createdAt)}</span>
                      </span>
                    </Link>
                    <QuickContact lead={lead} size="sm" />
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <LinkButton href="/admin/leads" variant="secondary">
                  See all enquiries
                </LinkButton>
              </div>
            </>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="At a glance">
            <dl className="divide-y divide-line">
              {(
                [
                  ["Events on the website", "/api/admin/events?status=published&limit=1", "/admin/events"],
                  ["Events still in draft", "/api/admin/events?status=draft&limit=1", "/admin/events"],
                  ["Enquiries in conversation", "/api/admin/leads?status=contacted&limit=1", "/admin/leads"],
                  ["Enquiries booked", "/api/admin/leads?status=booked&limit=1", "/admin/leads"],
                ] as const
              ).map(([label, path, href]) => (
                <div key={label}>
                  <Link href={href} className="flex items-center justify-between py-3 hover:text-brand">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd>
                      <Count path={path} />
                    </dd>
                  </Link>
                </div>
              ))}
            </dl>
          </Panel>

          {(drafts.meta?.total ?? 0) > 0 && (
            <div className="rounded-xl border border-gold/30 bg-gold-soft p-4 text-sm text-gold">
              <p className="font-semibold">
                {drafts.meta!.total} event{drafts.meta!.total === 1 ? " is" : "s are"} still a draft.
              </p>
              <p className="mt-1">Visitors cannot see drafts. Publish them when the photos and details are ready.</p>
              <Link href="/admin/events?status=draft" className="mt-2 inline-block font-semibold underline">
                Review drafts
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
