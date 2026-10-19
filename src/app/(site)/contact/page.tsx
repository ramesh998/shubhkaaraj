import { Suspense } from "react";
import type { Metadata } from "next";
import { getSettings } from "@/lib/public/data";
import { telHref, whatsappHref } from "@/lib/site";
import { EnquiryForm } from "@/components/site/enquiry-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell ShubhKaaraj about your wedding or corporate event and get a call back within one working day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 md:pt-14">
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Plan your event with us</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">Share a few details and we will call you within one working day. Or reach us directly.</p>
      <Suspense fallback={<div className="h-[40rem]" />}>
        <Body />
      </Suspense>
    </div>
  );
}

async function Body() {
  const s = await getSettings();
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-8">
        <EnquiryForm whatsapp={s.whatsapp} />
      </div>
      <aside className="space-y-6">
        {s.phone && (
          <div>
            <h2 className="font-semibold text-ink">Call</h2>
            <a href={telHref(s.phone)} className="text-lg text-brand underline underline-offset-4">{s.phone}</a>
          </div>
        )}
        {s.whatsapp && (
          <div>
            <h2 className="font-semibold text-ink">WhatsApp</h2>
            <a href={whatsappHref(s.whatsapp)} className="text-lg text-brand underline underline-offset-4">Start a chat</a>
          </div>
        )}
        {s.email && (
          <div>
            <h2 className="font-semibold text-ink">Email</h2>
            <a href={`mailto:${s.email}`} className="text-lg text-brand underline underline-offset-4">{s.email}</a>
          </div>
        )}
        {s.address && (
          <div>
            <h2 className="font-semibold text-ink">Studio</h2>
            <p className="text-lg">{s.address}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
