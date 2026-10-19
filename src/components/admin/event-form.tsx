"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { api, errorMessage, fieldErrors } from "./api";
import { useApi } from "./use-api";
import { useUnsavedWarning } from "./hooks";
import { useAdmin } from "./providers";
import { ImageUploader } from "./image-uploader";
import {
  Button,
  CATEGORY_LABELS,
  ErrorBlock,
  Field,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Panel,
  SelectInput,
  Switch,
  TagInput,
  TextArea,
  TextInput,
} from "./ui";
import type { EventRecord, MediaImage, PublishStatus } from "./types";

type FormState = {
  title: string;
  slug: string;
  category: string;
  city: string;
  venue: string;
  eventDate: string;
  guestCount: string;
  tags: string[];
  status: PublishStatus;
  featured: boolean;
  story: string;
  videoUrl: string;
  seoTitle: string;
  seoDescription: string;
  images: MediaImage[];
  cover: MediaImage | null;
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  category: "wedding-decor",
  city: "",
  venue: "",
  eventDate: "",
  guestCount: "",
  tags: [],
  status: "draft",
  featured: false,
  story: "",
  videoUrl: "",
  seoTitle: "",
  seoDescription: "",
  images: [],
  cover: null,
};

function toForm(ev: EventRecord): FormState {
  return {
    title: ev.title,
    slug: ev.slug,
    category: ev.category,
    city: ev.city,
    venue: ev.venue ?? "",
    eventDate: ev.eventDate ? ev.eventDate.slice(0, 10) : "",
    guestCount: ev.guestCount != null ? String(ev.guestCount) : "",
    tags: ev.tags ?? [],
    status: ev.status,
    featured: ev.featured,
    story: ev.story ?? "",
    videoUrl: ev.videoUrl ?? "",
    seoTitle: ev.seo?.title ?? "",
    seoDescription: ev.seo?.description ?? "",
    images: ev.images ?? [],
    cover: ev.coverImage ?? null,
  };
}

function toPayload(f: FormState, isNew: boolean) {
  const cover = f.cover && f.images.some((i) => i.baseKey === f.cover!.baseKey) ? f.cover : (f.images[0] ?? null);
  return {
    title: f.title,
    ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
    category: f.category,
    city: f.city,
    venue: f.venue,
    eventDate: f.eventDate,
    guestCount: f.guestCount === "" ? null : Number(f.guestCount),
    tags: f.tags,
    status: f.status,
    featured: f.featured,
    story: f.story,
    videoUrl: f.videoUrl,
    seo: { title: f.seoTitle, description: f.seoDescription },
    images: f.images,
    coverImage: cover,
    ...(isNew ? {} : {}),
  };
}

/** /admin/events/[id] */
export function EventEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EventForm id={id} />;
}

export function EventForm({ id }: { id?: string }) {
  const router = useRouter();
  const { success, error: toastError, confirm } = useAdmin();
  const loaded = useApi<EventRecord>(id ? `/api/admin/events/${id}` : null);
  const [saved, setSaved] = useState<EventRecord | null>(null);
  const [edits, setEdits] = useState<Partial<FormState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const record = saved ?? loaded.data ?? null;
  const base = record ? toForm(record) : EMPTY;
  const form: FormState = { ...base, ...edits };
  const dirty = Object.keys(edits).length > 0;
  useUnsavedWarning(dirty);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setEdits((e) => ({ ...e, [key]: value }));

  if (id && loaded.error) return <ErrorBlock message={loaded.error} onRetry={loaded.reload} />;
  if (id && !record) return <LoadingBlock />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (id) {
        const res = await api<EventRecord>(`/api/admin/events/${id}`, { method: "PATCH", json: toPayload(form, false) });
        setSaved(res.data);
        setEdits({});
        success("Changes saved");
      } else {
        const res = await api<EventRecord>("/api/admin/events", { method: "POST", json: toPayload(form, true) });
        setEdits({});
        success("Event created");
        router.replace(`/admin/events/${res.data._id}`);
      }
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      toastError(Object.keys(fe).length ? "Some details need fixing. See the highlighted fields." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete "${record?.title}"?`,
      message: "The event and all of its photos will be removed. This cannot be undone.",
      confirmLabel: "Delete event",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/events/${id}`, { method: "DELETE" });
      setEdits({});
      success("Event deleted");
      router.replace("/admin/events");
    } catch (err) {
      toastError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title={id ? "Edit event" : "Add event"}
        description={id ? record?.title : "Add the details and photos, then publish when it looks right."}
        actions={
          <>
            <LinkButton href="/admin/events" variant="ghost">
              Back to events
            </LinkButton>
            <Button type="submit" form="event-form" loading={busy}>
              {id ? "Save changes" : "Create event"}
            </Button>
          </>
        }
      />

      <form id="event-form" onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_17rem]" noValidate>
        <div className="space-y-6">
          <Panel title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Title" error={errors.title} className="sm:col-span-2" hint="Example: Royal Rajasthani mandap at City Palace">
                {(p) => <TextInput {...p} required value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />}
              </Field>
              <Field label="Type" error={errors.category}>
                {(p) => (
                  <SelectInput {...p} value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>
              <Field label="City" error={errors.city}>
                {(p) => <TextInput {...p} required value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />}
              </Field>
              <Field label="Venue" error={errors.venue}>
                {(p) => <TextInput {...p} value={form.venue} onChange={(e) => set("venue", e.target.value)} maxLength={160} />}
              </Field>
              <Field label="Event date" error={errors.eventDate}>
                {(p) => <TextInput {...p} type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} />}
              </Field>
              <Field label="Number of guests" error={errors.guestCount}>
                {(p) => (
                  <TextInput {...p} type="number" inputMode="numeric" min={0} value={form.guestCount} onChange={(e) => set("guestCount", e.target.value)} />
                )}
              </Field>
              <Field label="Tags" hint="Press Enter after each one, like sangeet or mehendi." error={errors.tags}>
                {(p) => (
                  <div {...p}>
                    <TagInput value={form.tags} onChange={(v) => set("tags", v)} placeholder="Add a tag" />
                  </div>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Photos" description="The cover photo appears on cards and in search results. Drag photos or use the arrows to reorder.">
            <ImageUploader
              label=""
              folder="events"
              max={60}
              value={form.images}
              onChange={(v) => set("images", v)}
              cover={form.cover}
              onCoverChange={(c) => set("cover", c)}
            />
            {errors.images && <p className="mt-2 text-sm text-danger">{errors.images}</p>}
          </Panel>

          <Panel title="Story and video">
            <div className="space-y-5">
              <Field label="Story" hint="A few lines about the theme, the couple or company, and what made this event special." error={errors.story}>
                {(p) => <TextArea {...p} rows={6} value={form.story} onChange={(e) => set("story", e.target.value)} maxLength={5000} />}
              </Field>
              <Field label="Video link" hint="A YouTube or Vimeo link to a highlight reel." error={errors.videoUrl}>
                {(p) => (
                  <TextInput {...p} type="url" inputMode="url" placeholder="https://youtu.be/..." value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Google search appearance" description="Optional. Leave empty and the title and story are used.">
            <div className="space-y-5">
              <Field label="Search title" hint={`${form.seoTitle.length}/70 characters`}>
                {(p) => <TextInput {...p} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} />}
              </Field>
              <Field label="Search description" hint={`${form.seoDescription.length}/170 characters`}>
                {(p) => <TextArea {...p} rows={3} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={170} />}
              </Field>
            </div>
          </Panel>
        </div>

        <aside className="order-first space-y-6 lg:sticky lg:top-6 lg:order-none lg:self-start">
          <Panel title="Visibility">
            <div className="space-y-5">
              <Switch
                checked={form.status === "published"}
                onChange={(v) => set("status", v ? "published" : "draft")}
                label="Show on website"
                description={form.status === "published" ? "Visitors can see this event." : "Saved as a draft. Only you can see it."}
              />
              <Switch
                checked={form.featured}
                onChange={(v) => set("featured", v)}
                label="Featured"
                description="Highlight on the home page."
              />
              {id && (
                <Field label="Page address" hint="Letters, numbers and hyphens." error={errors.slug}>
                  {(p) => <TextInput {...p} value={form.slug} onChange={(e) => set("slug", e.target.value)} />}
                </Field>
              )}
            </div>
            <Button type="submit" loading={busy} className="mt-6 w-full">
              {id ? "Save changes" : "Create event"}
            </Button>
            {dirty && <p className="mt-2 text-center text-sm text-gold">You have unsaved changes.</p>}
          </Panel>

        </aside>
      </form>
      {id && (
        <div className="mt-8 border-t border-line pt-6">
          <Button variant="danger" onClick={remove}>
            Delete event
          </Button>
        </div>
      )}
    </>
  );
}
