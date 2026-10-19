"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrors } from "./api";
import { useApi } from "./use-api";
import { useAdmin } from "./providers";
import { ImageUploader } from "./image-uploader";
import {
  Button,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  PageHeader,
  Pagination,
  Pill,
  Switch,
  TextArea,
  TextInput,
} from "./ui";
import type { MediaImage, TestimonialRecord } from "./types";

type Draft = {
  id?: string;
  name: string;
  quote: string;
  eventLabel: string;
  order: string;
  approved: boolean;
  photo: MediaImage | null;
};

const BLANK: Draft = { name: "", quote: "", eventLabel: "", order: "0", approved: true, photo: null };

const fromRecord = (t: TestimonialRecord): Draft => ({
  id: t._id,
  name: t.name,
  quote: t.quote,
  eventLabel: t.eventLabel ?? "",
  order: String(t.order ?? 0),
  approved: t.approved,
  photo: t.photo ?? null,
});

export function TestimonialsManager() {
  const { success, error: toastError, confirm } = useAdmin();
  const [page, setPage] = useState(1);
  const { data, meta, error, loading, reload } = useApi<TestimonialRecord[]>(`/api/admin/testimonials?page=${page}&limit=20`);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (draft && !el.open) el.showModal();
    if (!draft && el.open) el.close();
  }, [draft]);

  const open = (d: Draft) => {
    setErrors({});
    setDraft(d);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setErrors({});
    const body = {
      name: draft.name,
      quote: draft.quote,
      eventLabel: draft.eventLabel,
      order: Number(draft.order) || 0,
      approved: draft.approved,
      photo: draft.photo,
    };
    try {
      if (draft.id) await api(`/api/admin/testimonials/${draft.id}`, { method: "PATCH", json: body });
      else await api("/api/admin/testimonials", { method: "POST", json: body });
      success(draft.id ? "Testimonial saved" : "Testimonial added");
      setDraft(null);
      reload();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) toastError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(t: TestimonialRecord) {
    try {
      await api(`/api/admin/testimonials/${t._id}`, { method: "PATCH", json: { approved: !t.approved } });
      success(t.approved ? "Hidden from the website" : "Now showing on the website");
      reload();
    } catch (err) {
      toastError(errorMessage(err));
    }
  }

  async function remove(t: TestimonialRecord) {
    if (!(await confirm({ title: `Delete the testimonial from ${t.name}?`, confirmLabel: "Delete testimonial", danger: true }))) return;
    try {
      await api(`/api/admin/testimonials/${t._id}`, { method: "DELETE" });
      success("Testimonial deleted");
      reload();
    } catch (err) {
      toastError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Kind words from clients. Only approved ones appear on the website."
        actions={<Button onClick={() => open(BLANK)}>Add testimonial</Button>}
      />

      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState
          title="Add your first testimonial"
          description="Ask happy clients for a line or two and add it here. Real names and events build trust."
          action={<Button onClick={() => open(BLANK)}>Add testimonial</Button>}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {data.map((t) => (
            <li key={t._id} className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4">
              {t.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.photo.variants?.[0]?.webp ?? t.photo.url} alt="" className="size-14 shrink-0 rounded-full object-cover" loading="lazy" />
              )}
              <div className="min-w-0 flex-1 basis-60">
                <p className="text-sm leading-relaxed text-text">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {t.name}
                  {t.eventLabel && <span className="font-normal text-muted">, {t.eventLabel}</span>}
                </p>
                <div className="mt-1.5">
                  <Pill tone={t.approved ? "ok" : "gold"}>{t.approved ? "Showing" : "Hidden"}</Pill>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="min-h-9 px-3" onClick={() => open(fromRecord(t))}>Edit</Button>
                <Button variant="secondary" className="min-h-9 px-3" onClick={() => toggle(t)}>{t.approved ? "Hide" : "Show"}</Button>
                <Button variant="danger" className="min-h-9 px-3" onClick={() => remove(t)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPage={setPage} />}

      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          setDraft(null);
        }}
        className="m-auto max-h-[92vh] w-[min(94vw,36rem)] overflow-y-auto rounded-xl border border-line bg-card p-0 text-text shadow-2xl"
      >
        {draft && (
          <form onSubmit={save} noValidate>
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-xl font-semibold text-ink">{draft.id ? "Edit testimonial" : "Add testimonial"}</h2>
            </div>
            <div className="space-y-5 px-5 py-5">
              <Field label="Client name" error={errors.name}>
                {(p) => <TextInput {...p} required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={100} />}
              </Field>
              <Field label="What they said" error={errors.quote} hint="At least 10 characters.">
                {(p) => <TextArea {...p} rows={4} required value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} maxLength={1000} />}
              </Field>
              <Field label="Event" hint="Example: Wedding, Udaipur" error={errors.eventLabel}>
                {(p) => <TextInput {...p} value={draft.eventLabel} onChange={(e) => setDraft({ ...draft, eventLabel: e.target.value })} maxLength={120} />}
              </Field>
              <ImageUploader
                label="Photo (optional)"
                folder="testimonials"
                max={1}
                value={draft.photo ? [draft.photo] : []}
                onChange={(v) => setDraft({ ...draft, photo: v[0] ?? null })}
              />
              <Switch
                checked={draft.approved}
                onChange={(v) => setDraft({ ...draft, approved: v })}
                label="Show on website"
                description="Turn off to keep it saved but hidden."
              />
              <Field label="Display order" hint="Lower numbers come first." error={errors.order}>
                {(p) => <TextInput {...p} type="number" inputMode="numeric" value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} />}
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{draft.id ? "Save changes" : "Add testimonial"}</Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
