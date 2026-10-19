import type { MetadataRoute } from "next";
import { getEventIndex, getServices } from "@/lib/public/data";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, services] = await Promise.all([getEventIndex(), getServices()]);
  const page = (path: string, priority: number, lastModified?: string) => ({
    url: `${SITE_URL}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    page("/", 1),
    page("/portfolio", 0.9),
    page("/services", 0.8),
    page("/contact", 0.8),
    ...services.map((s) => page(`/services/${s.slug}`, 0.7)),
    ...events.map((e) => page(`/portfolio/${e.slug}`, 0.7, e.updatedAt)),
  ];
}
