"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrors } from "./api";
import { useApi } from "./use-api";
import { useUnsavedWarning } from "./hooks";
import { useAdmin } from "./providers";
import { Button, ErrorBlock, Field, LoadingBlock, PageHeader, Panel, TextArea, TextInput } from "./ui";
import type { SettingsRecord } from "./types";

type FormState = {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  youtube: string;
  pinterest: string;
  heroHeading: string;
  heroSubheading: string;
  heroVideoUrl: string;
  seoTitle: string;
  seoDescription: string;
};

const toForm = (s: SettingsRecord): FormState => ({
  businessName: s.businessName ?? "ShubhKaaraj",
  tagline: s.tagline ?? "",
  phone: s.phone ?? "",
  whatsapp: s.whatsapp ?? "",
  email: s.email ?? "",
  address: s.address ?? "",
  instagram: s.social?.instagram ?? "",
  facebook: s.social?.facebook ?? "",
  youtube: s.social?.youtube ?? "",
  pinterest: s.social?.pinterest ?? "",
  heroHeading: s.hero?.heading ?? "",
  heroSubheading: s.hero?.subheading ?? "",
  heroVideoUrl: s.hero?.videoUrl ?? "",
  seoTitle: s.seo?.title ?? "",
  seoDescription: s.seo?.description ?? "",
});

export function SettingsForm() {
  const { success, error: toastError } = useAdmin();
  const loaded = useApi<SettingsRecord>("/api/admin/settings");
  const [saved, setSaved] = useState<SettingsRecord | null>(null);
  const [edits, setEdits] = useState<Partial<FormState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const record = saved ?? loaded.data ?? null;
  const form: FormState | null = record ? { ...toForm(record), ...edits } : null;
  const dirty = Object.keys(edits).length > 0;
  useUnsavedWarning(dirty);

  if (loaded.error) return <ErrorBlock message={loaded.error} onRetry={loaded.reload} />;
  if (!form) return <LoadingBlock />;
  const set = <K extends keyof FormState>(k: K, v: string) => setEdits((e) => ({ ...e, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setErrors({});
    try {
      const res = await api<SettingsRecord>("/api/admin/settings", {
        method: "PUT",
        json: {
          businessName: form.businessName,
          tagline: form.tagline,
          phone: form.phone,
          whatsapp: form.whatsapp.replace(/\D/g, ""),
          email: form.email,
          address: form.address,
          social: { instagram: form.instagram, facebook: form.facebook, youtube: form.youtube, pinterest: form.pinterest },
          hero: { heading: form.heroHeading, subheading: form.heroSubheading, videoUrl: form.heroVideoUrl },
          seo: { title: form.seoTitle, description: form.seoDescription },
        },
      });
      setSaved(res.data);
      setEdits({});
      success("Settings saved");
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      toastError(Object.keys(fe).length ? "Some details need fixing. See the highlighted fields." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Contact details, social links and the words at the top of the home page."
        actions={<Button type="submit" form="settings-form" loading={busy}>Save settings</Button>}
      />
      <form id="settings-form" onSubmit={submit} className="space-y-6" noValidate>
        <Panel title="Business and contact" description="Shown in the website header, footer and contact page.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Business name" error={errors.businessName}>
              {(p) => <TextInput {...p} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />}
            </Field>
            <Field label="Tagline" error={errors.tagline}>
              {(p) => <TextInput {...p} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} />}
            </Field>
            <Field label="Phone" hint="Used for the call button." error={errors.phone}>
              {(p) => <TextInput {...p} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />}
            </Field>
            <Field label="WhatsApp number" hint="Digits only, with country code, like 919876543210." error={errors.whatsapp}>
              {(p) => <TextInput {...p} inputMode="numeric" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />}
            </Field>
            <Field label="Email" error={errors.email}>
              {(p) => <TextInput {...p} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
            </Field>
            <Field label="Address" error={errors.address}>
              {(p) => <TextInput {...p} value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={300} />}
            </Field>
          </div>
        </Panel>

        <Panel title="Social media" description="Paste the full profile links.">
          <div className="grid gap-5 sm:grid-cols-2">
            {(["instagram", "facebook", "youtube", "pinterest"] as const).map((k) => (
              <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                {(p) => <TextInput {...p} type="url" inputMode="url" value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={`https://${k}.com/...`} />}
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="Home page top section">
          <div className="space-y-5">
            <Field label="Main heading" error={errors.hero}>
              {(p) => <TextInput {...p} value={form.heroHeading} onChange={(e) => set("heroHeading", e.target.value)} maxLength={160} />}
            </Field>
            <Field label="Supporting line">
              {(p) => <TextArea {...p} rows={2} value={form.heroSubheading} onChange={(e) => set("heroSubheading", e.target.value)} maxLength={300} />}
            </Field>
            <Field label="Highlight video link" hint="A YouTube or Vimeo link.">
              {(p) => <TextInput {...p} type="url" inputMode="url" value={form.heroVideoUrl} onChange={(e) => set("heroVideoUrl", e.target.value)} />}
            </Field>
          </div>
        </Panel>

        <Panel title="Google search appearance" description="How the home page looks in search results.">
          <div className="space-y-5">
            <Field label="Search title" hint={`${form.seoTitle.length}/70 characters`}>
              {(p) => <TextInput {...p} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} />}
            </Field>
            <Field label="Search description" hint={`${form.seoDescription.length}/170 characters`}>
              {(p) => <TextArea {...p} rows={3} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={170} />}
            </Field>
          </div>
        </Panel>

        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-sm text-gold">You have unsaved changes.</span>}
          <Button type="submit" loading={busy}>Save settings</Button>
        </div>
      </form>
    </>
  );
}
