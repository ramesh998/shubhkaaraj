"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage, fieldErrors } from "./api";
import { useApi } from "./use-api";
import { useUnsavedWarning } from "./hooks";
import { useAdmin } from "./providers";
import { ImageUploader } from "./image-uploader";
import {
  Button,
  EmptyState,
  ErrorBlock,
  Field,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusPill,
  Switch,
  TextArea,
  TextInput,
} from "./ui";
import type { MediaImage, PublishStatus, ServiceRecord } from "./types";

/* ----------------------------------- List ---------------------------------- */

export function ServicesList() {
  const { success, error: toastError, confirm } = useAdmin();
  const { data, error, loading, reload } = useApi<ServiceRecord[]>("/api/admin/services?limit=100");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(s: ServiceRecord) {
    setBusyId(s._id);
    try {
      await api(`/api/admin/services/${s._id}`, { method: "PATCH", json: { status: s.status === "published" ? "draft" : "published" } });
      success(s.status === "published" ? "Service hidden from the website" : "Service published");
      reload();
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(s: ServiceRecord) {
    if (!(await confirm({ title: `Delete "${s.title}"?`, message: "Its photos will be removed too. This cannot be undone.", confirmLabel: "Delete service", danger: true }))) return;
    setBusyId(s._id);
    try {
      await api(`/api/admin/services/${s._id}`, { method: "DELETE" });
      success("Service deleted");
      reload();
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Services"
        description="What you offer, shown on the Services pages. Lower numbers appear first."
        actions={<LinkButton href="/admin/services/new" variant="primary">Add service</LinkButton>}
      />
      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState
          title="Describe what you offer"
          description="Add a service such as Wedding decor or Corporate event planning, with what is included and a few photos."
          action={<LinkButton href="/admin/services/new" variant="primary">Add service</LinkButton>}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {data.map((s) => (
            <li key={s._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <Link href={`/admin/services/${s._id}`} className="min-w-0 flex-1 basis-60">
                <span className="block truncate font-semibold text-ink">{s.title}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">{s.summary || "No summary yet"}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <StatusPill status={s.status} />
                  <span className="text-xs text-muted">Order {s.order}</span>
                </span>
              </Link>
              <div className="flex gap-2">
                <Button variant="secondary" className="min-h-9 px-3" loading={busyId === s._id} onClick={() => toggle(s)}>
                  {s.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="danger" className="min-h-9 px-3" disabled={busyId === s._id} onClick={() => remove(s)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ----------------------------------- Form ---------------------------------- */

type FormState = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  inclusions: string; // one per line
  status: PublishStatus;
  order: string;
  seoTitle: string;
  seoDescription: string;
  images: MediaImage[];
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  inclusions: "",
  status: "draft",
  order: "0",
  seoTitle: "",
  seoDescription: "",
  images: [],
};

const toForm = (s: ServiceRecord): FormState => ({
  title: s.title,
  slug: s.slug,
  summary: s.summary ?? "",
  description: s.description ?? "",
  inclusions: (s.inclusions ?? []).join("\n"),
  status: s.status,
  order: String(s.order ?? 0),
  seoTitle: s.seo?.title ?? "",
  seoDescription: s.seo?.description ?? "",
  images: s.images ?? [],
});

export function ServiceEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ServiceForm id={id} />;
}

export function ServiceForm({ id }: { id?: string }) {
  const router = useRouter();
  const { success, error: toastError, confirm } = useAdmin();
  const loaded = useApi<ServiceRecord>(id ? `/api/admin/services/${id}` : null);
  const [saved, setSaved] = useState<ServiceRecord | null>(null);
  const [edits, setEdits] = useState<Partial<FormState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const record = saved ?? loaded.data ?? null;
  const form: FormState = { ...(record ? toForm(record) : EMPTY), ...edits };
  const dirty = Object.keys(edits).length > 0;
  useUnsavedWarning(dirty);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setEdits((e) => ({ ...e, [k]: v }));

  if (id && loaded.error) return <ErrorBlock message={loaded.error} onRetry={loaded.reload} />;
  if (id && !record) return <LoadingBlock />;

  const payload = () => ({
    title: form.title,
    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    summary: form.summary,
    description: form.description,
    inclusions: form.inclusions.split("\n").map((l) => l.trim()).filter(Boolean),
    status: form.status,
    order: Number(form.order) || 0,
    seo: { title: form.seoTitle, description: form.seoDescription },
    images: form.images,
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (id) {
        const res = await api<ServiceRecord>(`/api/admin/services/${id}`, { method: "PATCH", json: payload() });
        setSaved(res.data);
        setEdits({});
        success("Changes saved");
      } else {
        const res = await api<ServiceRecord>("/api/admin/services", { method: "POST", json: payload() });
        setEdits({});
        success("Service created");
        router.replace(`/admin/services/${res.data._id}`);
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
    if (!(await confirm({ title: `Delete "${record?.title}"?`, message: "Its photos will be removed too. This cannot be undone.", confirmLabel: "Delete service", danger: true }))) return;
    try {
      await api(`/api/admin/services/${id}`, { method: "DELETE" });
      setEdits({});
      success("Service deleted");
      router.replace("/admin/services");
    } catch (err) {
      toastError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title={id ? "Edit service" : "Add service"}
        description={id ? record?.title : undefined}
        actions={
          <>
            <LinkButton href="/admin/services" variant="ghost">Back to services</LinkButton>
            <Button type="submit" form="service-form" loading={busy}>{id ? "Save changes" : "Create service"}</Button>
          </>
        }
      />
      <form id="service-form" onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_17rem]" noValidate>
        <div className="space-y-6">
          <Panel title="Details">
            <div className="space-y-5">
              <Field label="Name" error={errors.title}>
                {(p) => <TextInput {...p} required value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />}
              </Field>
              <Field label="Short summary" hint="One or two lines shown on cards." error={errors.summary}>
                {(p) => <TextArea {...p} rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} />}
              </Field>
              <Field label="Full description" error={errors.description}>
                {(p) => <TextArea {...p} rows={7} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />}
              </Field>
              <Field label="What is included" hint="One item per line, such as Stage and mandap design or Floral arrangements." error={errors.inclusions}>
                {(p) => <TextArea {...p} rows={6} value={form.inclusions} onChange={(e) => set("inclusions", e.target.value)} />}
              </Field>
            </div>
          </Panel>
          <Panel title="Photos">
            <ImageUploader label="" folder="services" max={12} value={form.images} onChange={(v) => set("images", v)} />
          </Panel>
          <Panel title="Google search appearance" description="Optional. Leave empty and the name and summary are used.">
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
                description={form.status === "published" ? "Visitors can see this service." : "Saved as a draft."}
              />
              <Field label="Display order" hint="Lower numbers come first." error={errors.order}>
                {(p) => <TextInput {...p} type="number" inputMode="numeric" value={form.order} onChange={(e) => set("order", e.target.value)} />}
              </Field>
              {id && (
                <Field label="Page address" error={errors.slug}>
                  {(p) => <TextInput {...p} value={form.slug} onChange={(e) => set("slug", e.target.value)} />}
                </Field>
              )}
            </div>
            <Button type="submit" loading={busy} className="mt-6 w-full">{id ? "Save changes" : "Create service"}</Button>
            {dirty && <p className="mt-2 text-center text-sm text-gold">You have unsaved changes.</p>}
          </Panel>
        </aside>
      </form>
      {id && (
        <div className="mt-8 border-t border-line pt-6">
          <Button variant="danger" onClick={remove}>Delete service</Button>
        </div>
      )}
    </>
  );
}
