import { revalidateTag } from "next/cache";

export type ContentTag = "events" | "services" | "testimonials" | "settings";

/**
 * Marks cached public data as stale so the next visit shows fresh content.
 * Public pages (built later) tag their cached reads with the same names.
 */
export function revalidateContent(tag: ContentTag) {
  try {
    revalidateTag(tag, "max");
  } catch (err) {
    // Never fail a successful write because cache invalidation threw.
    console.error(`[revalidate] ${tag}:`, err);
  }
}
