import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { connectDB } from "@/lib/db";
import type { EventCategory } from "@/lib/constants";
import { Event } from "@/models/Event";
import { Service } from "@/models/Service";
import { Testimonial } from "@/models/Testimonial";
import { SiteSettings } from "@/models/SiteSettings";
import type { PublicEvent, PublicImage, PublicService, PublicSettings, PublicTestimonial } from "./types";

/* -------------------------------- mappers --------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);

function image(i: any): PublicImage | undefined {
  if (!i?.url) return undefined;
  return {
    url: i.url,
    width: i.width,
    height: i.height,
    alt: i.alt ?? "",
    blur: i.blurDataURL || undefined,
    variants: (i.variants ?? []).map((v: any) => ({ width: v.width, webp: v.webp, avif: v.avif })),
  };
}
const images = (list: any[] | undefined) =>
  [...(list ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(image).filter((i): i is PublicImage => !!i);

function toEvent(d: any, withDetail: boolean): PublicEvent {
  const imgs = images(d.images);
  return {
    id: String(d._id),
    slug: d.slug,
    title: d.title,
    category: d.category,
    city: d.city,
    venue: text(d.venue),
    eventDate: iso(d.eventDate),
    guestCount: d.guestCount ?? undefined,
    tags: d.tags ?? [],
    featured: !!d.featured,
    cover: image(d.coverImage) ?? imgs[0],
    images: withDetail ? imgs : [],
    story: withDetail ? text(d.story) : undefined,
    videoUrl: withDetail ? text(d.videoUrl) : undefined,
    seoTitle: text(d.seo?.title),
    seoDescription: text(d.seo?.description),
    updatedAt: iso(d.updatedAt) ?? new Date(0).toISOString(),
  };
}

function toService(d: any): PublicService {
  return {
    id: String(d._id),
    slug: d.slug,
    title: d.title,
    summary: text(d.summary),
    description: text(d.description),
    inclusions: d.inclusions ?? [],
    images: images(d.images),
    seoTitle: text(d.seo?.title),
    seoDescription: text(d.seo?.description),
  };
}

/* ------------------------------ failure policy ----------------------------- */

/**
 * Database trouble must not take the public site down, and an outage must never be
 * cached or baked into a prerendered page. On failure we log, defer to request time
 * (so a build without a database leaves a hole instead of an empty page) and fall back.
 */
async function safe<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  // `next build` (and Docker image builds) have no database: leave a hole to fill at request time.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    await connection();
    return fallback;
  }
  try {
    return await read();
  } catch (err) {
    unstable_rethrow(err);
    console.error("[public-data]", err instanceof Error ? err.message : err);
    await connection();
    return fallback;
  }
}

/* -------------------------------- queries ---------------------------------- */

async function readSettings(): Promise<PublicSettings | null> {
  "use cache";
  cacheTag("settings");
  cacheLife("minutes");
  await connectDB();
  const s: any = await SiteSettings.findOne({ key: "site" }).lean();
  if (!s) return null;
  return {
    businessName: text(s.businessName) ?? "ShubhKaaraj",
    tagline: text(s.tagline),
    phone: text(s.phone),
    whatsapp: text(s.whatsapp),
    email: text(s.email),
    address: text(s.address),
    social: {
      instagram: text(s.social?.instagram),
      facebook: text(s.social?.facebook),
      youtube: text(s.social?.youtube),
      pinterest: text(s.social?.pinterest),
    },
    hero: { heading: text(s.hero?.heading), subheading: text(s.hero?.subheading) },
    seoTitle: text(s.seo?.title),
    seoDescription: text(s.seo?.description),
  };
}

export const DEFAULT_SETTINGS: PublicSettings = {
  businessName: "ShubhKaaraj",
  tagline: "Wedding and corporate event decor and planning",
  social: {},
  hero: {},
};

export async function getSettings(): Promise<PublicSettings> {
  return (await safe(readSettings, null)) ?? DEFAULT_SETTINGS;
}

async function readEvents(category: string, limit: number, featuredOnly: boolean): Promise<PublicEvent[]> {
  "use cache";
  cacheTag("events");
  cacheLife("minutes");
  await connectDB();
  const filter: Record<string, unknown> = { status: "published" };
  if (category) filter.category = { $in: category.split(",") };
  if (featuredOnly) filter.featured = true;
  const docs = await Event.find(filter, { images: 0, story: 0 })
    .sort({ featured: -1, eventDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => toEvent(d, false));
}

/** `category` may be a comma-separated list. */
export async function getEvents(opts: { category?: EventCategory | string; limit?: number; featuredOnly?: boolean } = {}) {
  return safe(() => readEvents(opts.category ?? "", opts.limit ?? 60, !!opts.featuredOnly), [] as PublicEvent[]);
}

async function readEvent(slug: string): Promise<PublicEvent | null> {
  "use cache";
  cacheTag("events");
  cacheLife("minutes");
  await connectDB();
  const d = await Event.findOne({ slug, status: "published" }).lean();
  return d ? toEvent(d, true) : null;
}
export const getEvent = (slug: string) => safe(() => readEvent(slug), null as PublicEvent | null);

async function readServices(): Promise<PublicService[]> {
  "use cache";
  cacheTag("services");
  cacheLife("minutes");
  await connectDB();
  const docs = await Service.find({ status: "published" }).sort({ order: 1, createdAt: 1 }).lean();
  return docs.map(toService);
}
export const getServices = () => safe(readServices, [] as PublicService[]);

export async function getService(slug: string) {
  return (await getServices()).find((s) => s.slug === slug) ?? null;
}

async function readTestimonials(): Promise<PublicTestimonial[]> {
  "use cache";
  cacheTag("testimonials");
  cacheLife("minutes");
  await connectDB();
  const docs: any[] = await Testimonial.find({ approved: true }).sort({ order: 1, createdAt: -1 }).limit(12).lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    quote: d.quote,
    eventLabel: text(d.eventLabel),
    photo: image(d.photo),
  }));
}
export const getTestimonials = () => safe(readTestimonials, [] as PublicTestimonial[]);

/** Slugs and dates for the sitemap. */
async function readEventIndex(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheTag("events");
  cacheLife("hours");
  await connectDB();
  const docs: any[] = await Event.find({ status: "published" }, { slug: 1, updatedAt: 1 }).lean();
  return docs.map((d) => ({ slug: d.slug, updatedAt: iso(d.updatedAt)! }));
}
export const getEventIndex = () => safe(readEventIndex, [] as { slug: string; updatedAt: string }[]);
