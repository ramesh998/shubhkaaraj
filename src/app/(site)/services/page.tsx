import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServices } from "@/lib/public/data";
import { Photo } from "@/components/site/photo";

export const metadata: Metadata = {
  title: "Services",
  description: "Wedding and corporate event decor and planning services from ShubhKaaraj.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 md:pt-14">
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">What we do</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">Decor, planning, or both. Start with what you need and we will shape the rest around your event.</p>
      <Suspense fallback={<div className="h-96" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const services = await getServices();
  if (!services.length) return <p className="mt-10 text-lg text-muted">Our service list is being updated. Please get in touch and we will happily explain what we offer.</p>;
  return (
    <ul className="mt-10 grid gap-6 md:grid-cols-2">
      {services.map((s) => (
        <li key={s.id}>
          <Link href={`/services/${s.slug}`} className="group block overflow-hidden rounded-2xl border border-line bg-card hover:border-brand">
            <div className="aspect-[16/10] bg-line">
              <Photo image={s.images[0]} sizes="(min-width:768px) 50vw, 100vw" />
            </div>
            <div className="p-6">
              <h2 className="font-display text-2xl font-semibold text-ink group-hover:text-brand">{s.title}</h2>
              {s.summary && <p className="mt-2 text-muted">{s.summary}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
