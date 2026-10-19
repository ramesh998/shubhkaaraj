import type { EventCategory } from "@/lib/constants";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const CATEGORY_LABEL: Record<EventCategory | "other", string> = {
  "wedding-decor": "Wedding decor",
  "wedding-planning": "Wedding planning",
  "corporate-decor": "Corporate decor",
  "corporate-planning": "Corporate planning",
  other: "Something else",
};

/** The two ways visitors browse: each maps to a pair of event categories. */
export const GROUPS = {
  wedding: { label: "Weddings", categories: ["wedding-decor", "wedding-planning"] },
  corporate: { label: "Corporate events", categories: ["corporate-decor", "corporate-planning"] },
} as const;
export type GroupKey = keyof typeof GROUPS;

export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d;
}

export function whatsappHref(phone: string, text = "Hi ShubhKaaraj, I would like to plan an event."): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function formatMonthYear(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
