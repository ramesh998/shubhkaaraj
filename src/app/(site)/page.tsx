import { Suspense } from "react";
import Link from "next/link";
import { getEvents, getServices, getSettings, getTestimonials } from "@/lib/public/data";
import { Photo } from "@/components/site/photo";
import { EventCard } from "@/components/site/event-card";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { SITE_URL, whatsappHref } from "@/lib/site";
import { JsonLd } from "@/components/site/json-ld";

export default function Home() {
  return (
    <>
      <Suspense fallback={<div className="h-[34rem]" />}>
        <Hero />
      </Suspense>
      <Tracks />
      <Suspense>
        <Recent />
      </Suspense>
      <Suspense>
        <Offer />
      </Suspense>
      <Suspense>
        <Voices />
      </Suspense>
      <Suspense fallback={<div className="h-96" />}>
        <Enquire />
      </Suspense>
    </>
  );
}

async function Hero() {
  const [s, featured] = await Promise.all([getSettings(), getEvents({ featuredOnly: true, limit: 2 })]);
  const fallbackPool = featured.length ? featured : await getEvents({ limit: 2 });
  const [a, b] = fallbackPool;
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-6 pt-10 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-16">
      <div>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] text-ink sm:text-6xl">
          {s.hero.heading ?? "Weddings and corporate events, decorated and planned with care."}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          {s.hero.subheading ??
            "From the first mandap sketch to the last guest leaving, we plan and style every detail so you can enjoy your own event."}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/contact" className="min-h-12 rounded-full bg-brand px-7 py-3.5 font-semibold text-white hover:bg-brand-strong">
            Plan my event
          </Link>
          {s.whatsapp ? (
            <a href={whatsappHref(s.whatsapp)} className="font-semibold text-brand underline underline-offset-4">
              Chat on WhatsApp
            </a>
          ) : (
            <Link href="/portfolio" className="font-semibold text-brand underline underline-offset-4">
              See our work
            </Link>
          )}
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "EventPlanner",
          name: s.businessName,
          url: SITE_URL,
          description: s.tagline ?? "Wedding and corporate event decor and planning",
          ...(s.phone ? { telephone: s.phone } : {}),
          ...(s.email ? { email: s.email } : {}),
          ...(s.address ? { address: s.address } : {}),
          sameAs: Object.values(s.social).filter(Boolean),
        }}
      />
      <div className="relative mx-auto h-[26rem] w-full max-w-md sm:h-[32rem]" aria-hidden={!a}>
        <div className="arch rise absolute inset-y-0 left-0 w-[68%]">
          <Photo image={a?.cover} sizes="(min-width:768px) 28vw, 70vw" priority />
        </div>
        <div className="arch-sm rise rise-late absolute bottom-0 right-0 h-[62%] w-[44%] border-4 border-paper">
          <Photo image={b?.cover} sizes="(min-width:768px) 18vw, 45vw" priority />
        </div>
      </div>
    </section>
  );
}

function Tracks() {
  const tracks = [
    { href: "/portfolio?type=wedding", title: "Weddings", body: "Mandaps, stages, entrances, sangeet and mehendi styling, with full planning if you want it.", cls: "bg-brand text-white" },
    { href: "/portfolio?type=corporate", title: "Corporate events", body: "Launches, conferences, annual days and dealer meets, designed to look sharp and run on time.", cls: "bg-ink text-white" },
  ];
  return (
    <section className="mx-auto mt-16 grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-2">
      {tracks.map((t) => (
        <Link key={t.title} href={t.href} className={`group rounded-2xl p-8 transition hover:-translate-y-0.5 ${t.cls}`}>
          <h2 className="font-display text-3xl font-semibold">{t.title}</h2>
          <p className="mt-3 max-w-md text-white/85">{t.body}</p>
          <p className="mt-6 font-semibold text-haldi group-hover:underline">See the work</p>
        </Link>
      ))}
    </section>
  );
}

async function Recent() {
  const events = await getEvents({ featuredOnly: true, limit: 6 });
  const list = events.length ? events : await getEvents({ limit: 6 });
  // Whole rows only: 6, or 3, or whatever is there when fewer than 3.
  const shown = list.slice(0, list.length >= 6 ? 6 : list.length >= 3 ? 3 : list.length);
  if (!shown.length) return null;
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Recent work</h2>
        <Link href="/portfolio" className="font-semibold text-brand underline underline-offset-4">
          All events
        </Link>
      </div>
      <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => (
          <EventCard key={e.id} event={e} arch />
        ))}
      </div>
    </section>
  );
}

async function Offer() {
  const services = await getServices();
  if (!services.length) return null;
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">What we do</h2>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {services.slice(0, 4).map((s) => (
          <li key={s.id}>
            <Link href={`/services/${s.slug}`} className="flex h-full gap-5 rounded-2xl border border-line bg-card p-5 hover:border-brand">
              <div className="aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-line sm:w-32">
                <Photo image={s.images[0]} sizes="128px" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">{s.title}</h3>
                {s.summary && <p className="mt-1.5 text-muted">{s.summary}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Voices() {
  const items = await getTestimonials();
  if (!items.length) return null;
  return (
    <section className="mt-24 bg-brand-soft py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Kind words</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {items.slice(0, 3).map((t) => (
            <li key={t.id} className="rounded-2xl bg-card p-6">
              <blockquote className="text-lg leading-relaxed text-text">“{t.quote}”</blockquote>
              <p className="mt-5 font-semibold text-ink">{t.name}</p>
              {t.eventLabel && <p className="text-muted">{t.eventLabel}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function Enquire() {
  const s = await getSettings();
  return (
    <section className="mt-24 bg-ink py-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">Tell us about your event</h2>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Share a few details and we will call you within one working day to talk through your ideas. No obligation.
          </p>
        </div>
        <EnquiryForm whatsapp={s.whatsapp} tone="dark" />
      </div>
    </section>
  );
}
