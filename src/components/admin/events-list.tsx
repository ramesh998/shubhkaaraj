"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { api, errorMessage } from "./api";
import { useApi } from "./use-api";
import { useDebounced } from "./hooks";
import { useAdmin } from "./providers";
import {
  Button,
  CATEGORY_LABELS,
  EmptyState,
  ErrorBlock,
  formatDate,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Pagination,
  SelectInput,
  StatusPill,
  TextInput,
} from "./ui";
import type { EventRecord } from "./types";

const LIMIT = 12;

export function EventsList() {
  const { success, error: toastError, confirm } = useAdmin();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const initialStatus = useSearchParams().get("status");
  const [status, setStatus] = useState(initialStatus === "draft" || initialStatus === "published" ? initialStatus : "");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounced(q);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (debouncedQ) params.set("q", debouncedQ);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  const { data, meta, error, loading, reload } = useApi<EventRecord[]>(`/api/admin/events?${params}`);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(ev: EventRecord, body: Record<string, unknown>, message: string) {
    setBusyId(ev._id);
    try {
      await api(`/api/admin/events/${ev._id}`, { method: "PATCH", json: body });
      success(message);
      reload();
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(ev: EventRecord) {
    const ok = await confirm({
      title: `Delete "${ev.title}"?`,
      message: "The event and all of its photos will be removed from the website. This cannot be undone.",
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!ok) return;
    setBusyId(ev._id);
    try {
      await api(`/api/admin/events/${ev._id}`, { method: "DELETE" });
      success("Event deleted");
      reload();
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = !!(debouncedQ || category || status);

  return (
    <>
      <PageHeader
        title="Events"
        description="The weddings and corporate events shown in your portfolio."
        actions={<LinkButton href="/admin/events/new" variant="primary">Add event</LinkButton>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
        <TextInput
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by title, city or venue"
          aria-label="Search events"
        />
        <SelectInput value={category} onChange={(e) => (setCategory(e.target.value), setPage(1))} aria-label="Filter by type">
          <option value="">All types</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </SelectInput>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        filtered ? (
          <EmptyState title="No events match" description="Try a different search or clear the filters." />
        ) : (
          <EmptyState
            title="Add your first event"
            description="Upload photos from a wedding or corporate event, add a few details, and publish it to your portfolio."
            action={<LinkButton href="/admin/events/new" variant="primary">Add event</LinkButton>}
          />
        )
      ) : (
        <ul className={`divide-y divide-line overflow-hidden rounded-xl border border-line bg-card ${loading ? "opacity-60" : ""}`}>
          {data.map((ev) => {
            const cover = ev.coverImage;
            const busy = busyId === ev._id;
            return (
              <li key={ev._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <Link href={`/admin/events/${ev._id}`} className="flex min-w-0 flex-1 basis-64 items-center gap-4">
                  <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg bg-paper sm:size-20">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.variants?.[0]?.webp ?? cover.url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="grid size-full place-items-center text-xs text-muted">No photo</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{ev.title}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted">
                      {CATEGORY_LABELS[ev.category]}, {ev.city}
                      {ev.eventDate ? `, ${formatDate(ev.eventDate)}` : ""}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={ev.status} />
                      {ev.featured && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold">Featured</span>}
                    </span>
                  </span>
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-9 px-3"
                    loading={busy}
                    onClick={() =>
                      patch(
                        ev,
                        { status: ev.status === "published" ? "draft" : "published" },
                        ev.status === "published" ? "Event hidden from the website" : "Event published",
                      )
                    }
                  >
                    {ev.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-9 px-3"
                    disabled={busy}
                    aria-pressed={ev.featured}
                    onClick={() =>
                      patch(ev, { featured: !ev.featured }, ev.featured ? "Removed from featured" : "Marked as featured")
                    }
                  >
                    {ev.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button variant="danger" className="min-h-9 px-3" disabled={busy} onClick={() => remove(ev)}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPage={setPage} />}
    </>
  );
}
