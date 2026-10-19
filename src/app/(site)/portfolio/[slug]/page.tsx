import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, getEvents, getSettings } from "@/lib/public/data";
import { CATEGORY_LABEL, SITE_URL, formatMonthYear } from "@/lib/site";
import { Photo } from "@/components/site/photo";
import { EventCard } from "@/components/site/event-card";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { JsonLd } from "@/components/site/json-ld";

export async function generateMetadata({ params }: PageProps<"/portfolio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();
  const description = e.seoDescription ?? e.story?.slice(0, 160) ?? `${CATEGORY_LABEL[e.category]} in ${e.city} by ShubhKaaraj.`;
  return {
    title: e.seoTitle ?? e.title,
    description,
    alternates: { canonical: `/portfolio/${e.slug}` },
    openGraph: { title: e.seoTitle ?? e.title, description, type: "article", images: e.cover ? [{ url: e.cover.url, width: e.cover.width, height: e.cover.height }] : undefined },
  };
}

export default function EventPage({ params }: PageProps<"/portfolio/[slug]">) {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/portfolio/[slug]">["params"] }) {
  const { slug } = await params;
  const [e, settings] = await Promise.all([getEvent(slug), getSettings()]);
  if (!e) notFound();
  const more = (await getEvents({ category: e.category, limit: 4 })).filter((x) => x.id !== e.id).slice(0, 3);
  const when = formatMonthYear(e.eventDate);
  const facts = [
    ["Type", CATEGORY_LABEL[e.category]],
    ["City", e.city],
    ["Venue", e.venue],
    ["Date", when],
    ["Guests", e.guestCount ? String(e.guestCount) : undefined],
  ].filter((f): f is [string, string] => !!f[1]);
  const [lead, ...rest] = e.images.length ? e.images : e.cover ? [e.cover] : [];

  return (
    <article className="mx-auto max-w-6xl px-4 pb-4 pt-8 sm:px-6 md:pt-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: e.title,
          url: `${SITE_URL}/portfolio/${e.slug}`,
          description: e.story?.slice(0, 200),
          image: e.images.slice(0, 10).map((i) => new URL(i.url, SITE_URL).toString()),
          locationCreated: { "@type": "Place", name: e.venue ? `${e.venue}, ${e.city}` : e.city },
          creator: { "@type": "Organization", name: settings.businessName, url: SITE_URL },
        }}
      />
      <nav aria-label="Breadcrumb" className="text-muted">
        <Link href="/portfolio" className="underline underline-offset-4 hover:text-brand">
          Portfolio
        </Link>
      </nav>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">{e.title}</h1>
      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {lead && (
        <div className="mt-8 aspect-[4/5] overflow-hidden rounded-2xl bg-line sm:aspect-[16/10]">
          <Photo image={lead} sizes="(min-width:1152px) 1152px, 100vw" priority />
        </div>
      )}

      {e.story && (
        <div className="mt-10 max-w-2xl space-y-4 text-lg leading-relaxed text-text">
          {e.story.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      {e.videoUrl && (
        <p className="mt-6">
          <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-4">
            Watch the highlight video
          </a>
        </p>
      )}

      {rest.length > 0 && (
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {rest.map((img, i) => (
            <div key={i} className="break-inside-avoid overflow-hidden rounded-xl bg-line">
              <Photo image={img} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
            </div>
          ))}
        </div>
      )}

      <section className="mt-16 rounded-3xl bg-ink px-5 py-10 sm:px-10">
        <h2 className="font-display text-3xl font-semibold text-white">Planning something like this?</h2>
        <p className="mt-3 max-w-xl text-white/80">Tell us about your event and we will call you within one working day.</p>
        <div className="mt-8">
          <EnquiryForm whatsapp={settings.whatsapp} defaultType={e.category} tone="dark" />
        </div>
      </section>

      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-ink">More {CATEGORY_LABEL[e.category].toLowerCase()}</h2>
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((x) => (
              <EventCard key={x.id} event={x} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
