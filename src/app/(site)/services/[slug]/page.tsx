import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, getSettings } from "@/lib/public/data";
import { SITE_URL } from "@/lib/site";
import { Photo } from "@/components/site/photo";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { JsonLd } from "@/components/site/json-ld";

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) notFound();
  return {
    title: s.seoTitle ?? s.title,
    description: s.seoDescription ?? s.summary,
    alternates: { canonical: `/services/${s.slug}` },
  };
}

export default function ServicePage({ params }: PageProps<"/services/[slug]">) {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/services/[slug]">["params"] }) {
  const { slug } = await params;
  const [s, settings] = await Promise.all([getService(slug), getSettings()]);
  if (!s) notFound();
  return (
    <article className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.title,
          description: s.summary ?? s.description?.slice(0, 200),
          url: `${SITE_URL}/services/${s.slug}`,
          provider: { "@type": "Organization", name: settings.businessName, url: SITE_URL },
          areaServed: "India",
        }}
      />
      <Link href="/services" className="text-muted underline underline-offset-4 hover:text-brand">
        All services
      </Link>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">{s.title}</h1>
      {s.summary && <p className="mt-4 max-w-2xl text-xl text-muted">{s.summary}</p>}

      {s.images[0] && (
        <div className="mt-8 overflow-hidden rounded-2xl bg-line">
          <Photo image={s.images[0]} sizes="(min-width:1152px) 1152px, 100vw" priority />
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        {s.description && (
          <div className="max-w-2xl space-y-4 text-lg leading-relaxed">
            {s.description.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        {s.inclusions.length > 0 && (
          <div className="h-fit rounded-2xl bg-brand-soft p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">What is included</h2>
            <ul className="mt-4 space-y-2.5">
              {s.inclusions.map((i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-haldi" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {s.images.length > 1 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.images.slice(1).map((img, i) => (
            <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl bg-line">
              <Photo image={img} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
            </div>
          ))}
        </div>
      )}

      <section className="mt-16 rounded-3xl bg-ink px-5 py-10 sm:px-10">
        <h2 className="font-display text-3xl font-semibold text-white">Interested in {s.title.toLowerCase()}?</h2>
        <div className="mt-8">
          <EnquiryForm whatsapp={settings.whatsapp} tone="dark" />
        </div>
      </section>
    </article>
  );
}
