"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CATEGORY_LABEL, whatsappHref } from "@/lib/site";

const TYPES = ["wedding-decor", "wedding-planning", "corporate-decor", "corporate-planning", "other"] as const;
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Props = { whatsapp?: string; defaultType?: string; tone?: "light" | "dark" };

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void }) => void };
  }
}

export function EnquiryForm({ whatsapp, defaultType, tone = "light" }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentName, setSentName] = useState<string | null>(null);
  const token = useRef("");
  const widget = useRef<HTMLDivElement>(null);
  const dark = tone === "dark";

  useEffect(() => {
    if (!SITE_KEY || !widget.current) return;
    const el = widget.current;
    const mount = () => window.turnstile?.render(el, { sitekey: SITE_KEY, callback: (t) => (token.current = t) });
    if (window.turnstile) return mount();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = mount;
    document.head.appendChild(s);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(
      (["source", "medium", "campaign", "term", "content"] as const)
        .map((k) => [k, params.get(`utm_${k}`) ?? ""])
        .filter(([, v]) => v),
    );
    const body = {
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email"),
      eventType: f.get("eventType"),
      eventDate: f.get("eventDate"),
      city: f.get("city"),
      guestCount: f.get("guestCount") || undefined,
      message: f.get("message"),
      website: f.get("website"),
      utm: Object.keys(utm).length ? utm : undefined,
      pageUrl: window.location.pathname,
      turnstileToken: token.current || undefined,
    };
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fe = (json?.error?.details?.fieldErrors ?? json?.details?.fieldErrors) as Record<string, string[]> | undefined;
        if (fe) setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]])));
        setFormError(
          fe ? "Please check the highlighted details." : (json?.error?.message ?? json?.error ?? "Something went wrong. Please try again."),
        );
        return;
      }
      setSentName(String(body.name).split(" ")[0]);
      form.reset();
    } catch {
      setFormError("We could not send your details. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const label = dark ? "text-white/90" : "text-ink";
  const input = `mt-1.5 w-full rounded-lg border px-3.5 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 ${
    dark ? "border-white/20 bg-white/95 text-text" : "border-line bg-white text-text"
  }`;
  const err = (k: string) => (errors[k] ? <p className={`mt-1 text-sm ${dark ? "text-haldi-soft" : "text-danger"}`}>{errors[k]}</p> : null);

  if (sentName) {
    return (
      <div role="status" className={`rounded-2xl p-7 ${dark ? "bg-white/10 text-white" : "bg-brand-soft text-ink"}`}>
        <h3 className="font-display text-2xl font-semibold">Thank you, {sentName}.</h3>
        <p className="mt-2 max-w-prose">
          We have your details and will call you within one working day. If it is urgent, message us on WhatsApp and we will reply as soon as we can.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {whatsapp && (
            <a href={whatsappHref(whatsapp)} className="rounded-full bg-[#1f7a4d] px-5 py-3 font-semibold text-white hover:bg-[#186139]">
              Message us on WhatsApp
            </a>
          )}
          <button type="button" onClick={() => setSentName(null)} className="rounded-full border border-current px-5 py-3 font-semibold">
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className={`block font-medium ${label}`}>
        Your name
        <input name="name" required autoComplete="name" className={input} aria-invalid={!!errors.name} />
        {err("name")}
      </label>
      <label className={`block font-medium ${label}`}>
        Phone number
        <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="98765 43210" className={input} aria-invalid={!!errors.phone} />
        {err("phone")}
      </label>
      <label className={`block font-medium ${label}`}>
        What are you planning?
        <select name="eventType" defaultValue={defaultType && TYPES.includes(defaultType as never) ? defaultType : "wedding-planning"} className={input}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {CATEGORY_LABEL[t]}
            </option>
          ))}
        </select>
        {err("eventType")}
      </label>
      <label className={`block font-medium ${label}`}>
        Event date <span className="font-normal opacity-70">(approximate is fine)</span>
        <input name="eventDate" type="date" className={input} />
        {err("eventDate")}
      </label>
      <label className={`block font-medium ${label}`}>
        City
        <input name="city" autoComplete="address-level2" className={input} />
        {err("city")}
      </label>
      <label className={`block font-medium ${label}`}>
        Number of guests
        <input name="guestCount" type="number" inputMode="numeric" min={0} className={input} />
        {err("guestCount")}
      </label>
      <label className={`block font-medium sm:col-span-2 ${label}`}>
        Email <span className="font-normal opacity-70">(optional)</span>
        <input name="email" type="email" autoComplete="email" className={input} aria-invalid={!!errors.email} />
        {err("email")}
      </label>
      <label className={`block font-medium sm:col-span-2 ${label}`}>
        Tell us about it
        <textarea name="message" rows={4} placeholder="Venue, theme, colours, anything you have in mind" className={input} />
        {err("message")}
      </label>
      {SITE_KEY && <div ref={widget} className="sm:col-span-2" />}
      {formError && (
        <p role="alert" className={`sm:col-span-2 rounded-lg px-4 py-3 font-medium ${dark ? "bg-white text-danger" : "bg-danger-soft text-danger"}`}>
          {formError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-full bg-haldi px-8 font-semibold text-ink transition hover:bg-[#f3b73a] disabled:opacity-60"
        >
          {busy ? "Sending..." : "Request a call back"}
        </button>
        {whatsapp && (
          <a href={whatsappHref(whatsapp)} className={`font-semibold underline underline-offset-4 ${dark ? "text-white" : "text-brand"}`}>
            or chat on WhatsApp
          </a>
        )}
      </div>
    </form>
  );
}
