"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LEAD_EVENT_TYPES, LEAD_STATUSES } from "@/lib/constants";
import { api, errorMessage } from "./api";
import { useApi } from "./use-api";
import { useDebounced } from "./hooks";
import { useAdmin } from "./providers";
import { useMe } from "./shell";
import { telLink, whatsappLink } from "./contact-links";
import {
  Button,
  CATEGORY_LABELS,
  cx,
  EmptyState,
  ErrorBlock,
  formatDate,
  LoadingBlock,
  PageHeader,
  Pagination,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
  timeAgo,
} from "./ui";
import type { LeadRecord, LeadStatus } from "./types";

const LIMIT = 15;
const STATUS_LABEL: Record<string, string> = { all: "All", new: "New", contacted: "Contacted", booked: "Booked", lost: "Lost" };

/** Call + WhatsApp, the two things you do first with an enquiry. */
export function QuickContact({ lead, size = "md" }: { lead: Pick<LeadRecord, "phone" | "name">; size?: "sm" | "md" }) {
  const cls = cx(
    "inline-flex items-center justify-center rounded-lg border font-semibold transition-colors",
    size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-10 px-4 text-sm",
  );
  return (
    <span className="inline-flex gap-2">
      <a href={telLink(lead.phone)} className={cx(cls, "border-line bg-card text-text hover:bg-paper")} aria-label={`Call ${lead.name}`}>
        Call
      </a>
      <a
        href={whatsappLink(lead.phone, lead.name)}
        target="_blank"
        rel="noreferrer"
        className={cx(cls, "border-ok/30 bg-ok-soft text-ok hover:bg-ok/15")}
        aria-label={`WhatsApp ${lead.name}`}
      >
        WhatsApp
      </a>
    </span>
  );
}

export function LeadsInbox() {
  const [status, setStatus] = useState<string>("all");
  const [eventType, setEventType] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const debouncedQ = useDebounced(q);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (status !== "all") params.set("status", status);
  if (eventType) params.set("eventType", eventType);
  if (debouncedQ) params.set("q", debouncedQ);
  const { data, meta, error, loading, reload } = useApi<LeadRecord[]>(`/api/admin/leads?${params}`);
  const exportParams = new URLSearchParams(params);
  exportParams.delete("page");
  exportParams.delete("limit");

  const open = data?.find((l) => l._id === openId) ?? null;
  const filtered = status !== "all" || !!eventType || !!debouncedQ;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="People who filled in the form on your website. Reply quickly: the first to respond usually wins the booking."
        actions={
          <a
            href={`/api/admin/leads/export?${exportParams}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold hover:bg-paper"
          >
            Download CSV
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {["all", ...LEAD_STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => (setStatus(s), setPage(1))}
            className={cx(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              status === s ? "bg-ink text-white" : "border border-line bg-card text-muted hover:text-text",
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <TextInput
          type="search"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPage(1))}
          placeholder="Search by name, phone, email or message"
          aria-label="Search enquiries"
        />
        <SelectInput value={eventType} onChange={(e) => (setEventType(e.target.value), setPage(1))} aria-label="Filter by event type">
          <option value="">All event types</option>
          {LEAD_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CATEGORY_LABELS[t]}
            </option>
          ))}
        </SelectInput>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState
          title={filtered ? "No enquiries match" : "No enquiries yet"}
          description={
            filtered
              ? "Try a different status, event type or search."
              : "When someone fills in the enquiry form on your website, it shows up here and you get an email."
          }
        />
      ) : (
        <ul className={cx("divide-y divide-line overflow-hidden rounded-xl border border-line bg-card", loading && "opacity-60")}>
          {data.map((lead) => (
            <li key={lead._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <button type="button" onClick={() => setOpenId(lead._id)} className="min-w-0 flex-1 basis-60 text-left">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink">{lead.name}</span>
                  <StatusPill status={lead.status} />
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted">
                  {CATEGORY_LABELS[lead.eventType] ?? lead.eventType}
                  {lead.city ? `, ${lead.city}` : ""}
                  {lead.eventDate ? `, ${formatDate(lead.eventDate)}` : ""}
                </span>
                {lead.message && <span className="mt-1 line-clamp-1 block text-sm text-text/80">{lead.message}</span>}
                <span className="mt-1 block text-xs text-muted">{timeAgo(lead.createdAt)}</span>
              </button>
              <QuickContact lead={lead} size="sm" />
            </li>
          ))}
        </ul>
      )}

      {meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPage={setPage} />}

      <LeadDialog openId={openId} lead={open} onClose={() => setOpenId(null)} onChanged={reload} />
    </>
  );
}

/* --------------------------------- Detail ---------------------------------- */

function LeadDialog({ openId, lead, onClose, onChanged }: { openId: string | null; lead: LeadRecord | null; onClose: () => void; onChanged: () => void }) {
  const { success, error: toastError, confirm } = useAdmin();
  const me = useMe();
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // Latest server copy of the lead after an edit, so the dialog updates before the list reloads.
  const [fresh, setFresh] = useState<LeadRecord | null>(null);
  const [shown, setShown] = useState<LeadRecord | null>(null);
  if (lead && lead !== shown) setShown(lead);
  const base = lead ?? (shown && shown._id === openId ? shown : null);
  const current = fresh && base && fresh._id === base._id ? fresh : base;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (openId && !el.open) el.showModal();
    if (!openId && el.open) el.close();
  }, [openId]);

  async function patch(body: { status?: LeadStatus; addNote?: string }, message: string) {
    if (!current) return;
    setBusy(true);
    try {
      const res = await api<LeadRecord>(`/api/admin/leads/${current._id}`, { method: "PATCH", json: body });
      setFresh(res.data);
      success(message);
      onChanged();
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await patch({ addNote: note.trim() }, "Note added");
    setNote("");
  }

  async function remove() {
    if (!current) return;
    if (!(await confirm({ title: `Delete the enquiry from ${current.name}?`, message: "This cannot be undone.", confirmLabel: "Delete enquiry", danger: true }))) return;
    try {
      await api(`/api/admin/leads/${current._id}`, { method: "DELETE" });
      success("Enquiry deleted");
      onClose();
      onChanged();
    } catch (e) {
      toastError(errorMessage(e));
    }
  }

  const rows: [string, string | undefined][] = current
    ? [
        ["Phone", current.phone],
        ["Email", current.email],
        ["Event type", CATEGORY_LABELS[current.eventType] ?? current.eventType],
        ["Event date", current.eventDate ? formatDate(current.eventDate) : undefined],
        ["City", current.city],
        ["Guests", current.guestCount != null ? String(current.guestCount) : undefined],
        ["Budget", current.budget],
        [
          "Came from",
          [current.utm?.source, current.utm?.medium, current.utm?.campaign].filter(Boolean).join(" / ") || "Direct visit",
        ],
        ["Received", formatDate(current.createdAt, true)],
      ]
    : [];

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto max-h-[92vh] w-[min(94vw,38rem)] overflow-y-auto rounded-xl border border-line bg-card p-0 text-text shadow-2xl"
    >
      {current && (
        <div>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">{current.name}</h2>
              <p className="mt-0.5 text-sm text-muted">{timeAgo(current.createdAt)}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-paper hover:text-text">
              ×
            </button>
          </div>

          <div className="space-y-6 px-5 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <QuickContact lead={current} />
              {current.email && (
                <a href={`mailto:${current.email}`} className="inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:bg-paper">
                  Email
                </a>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {rows.map(([k, v]) =>
                v ? (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="mt-0.5 break-words font-medium text-text">{v}</dd>
                  </div>
                ) : null,
              )}
            </dl>

            {current.message && (
              <div>
                <p className="text-sm text-muted">Message</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-paper p-3 text-sm leading-relaxed">{current.message}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-text">Where is this enquiry?</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Enquiry status">
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    aria-pressed={current.status === s}
                    onClick={() => current.status !== s && patch({ status: s }, `Marked as ${s}`)}
                    className={cx(
                      "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60",
                      current.status === s ? "bg-brand text-white" : "border border-line bg-card text-muted hover:text-text",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-text">Notes</p>
              {current.notes?.length ? (
                <ul className="mb-3 space-y-2">
                  {current.notes.map((n, i) => (
                    <li key={i} className="rounded-lg bg-paper p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1 text-xs text-muted">
                        {n.by ? `${n.by}, ` : ""}
                        {formatDate(n.createdAt, true)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-muted">No notes yet. Write down what you agreed on the call.</p>
              )}
              <form onSubmit={addNote} className="space-y-2">
                <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" aria-label="Add a note" maxLength={1000} className="min-h-0" />
                <Button type="submit" variant="secondary" disabled={!note.trim()} loading={busy}>
                  Add note
                </Button>
              </form>
            </div>
          </div>

          {me.role === "admin" && (
            <div className="border-t border-line px-5 py-3">
              <Button variant="danger" className="min-h-9" onClick={remove}>
                Delete enquiry
              </Button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
