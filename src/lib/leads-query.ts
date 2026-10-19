import type { z } from "zod";
import type { leadListQuerySchema } from "./validators/lead";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Builds the Mongo filter shared by the lead list and the CSV export. */
export function buildLeadFilter(q: Pick<z.infer<typeof leadListQuerySchema>, "status" | "eventType" | "city" | "q">) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.eventType) filter.eventType = q.eventType;
  if (q.city) filter.city = new RegExp(`^${escapeRegex(q.city)}$`, "i");
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { message: rx }];
  }
  return filter;
}

/** Neutralises spreadsheet formula injection and quotes the value for CSV. */
export function csvCell(value: unknown): string {
  let s = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
