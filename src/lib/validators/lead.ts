import { z } from "zod";
import { LEAD_EVENT_TYPES, LEAD_STATUSES } from "@/lib/constants";
import { optionalText, paginationSchema, phone } from "./common";

const utmField = z.string().trim().max(120).optional();

/** Public inquiry form. */
export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  phone,
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  eventType: z.enum(LEAD_EVENT_TYPES),
  eventDate: z.coerce
    .date()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  city: optionalText(80),
  budget: optionalText(60),
  guestCount: z.coerce.number().int().min(0).max(100000).optional(),
  message: optionalText(2000),
  utm: z
    .object({
      source: utmField,
      medium: utmField,
      campaign: utmField,
      term: utmField,
      content: utmField,
    })
    .optional(),
  pageUrl: z.string().trim().max(500).optional(),
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot: real visitors never fill this in. */
  website: z.string().max(200).optional(),
});
export type LeadInput = z.infer<typeof leadCreateSchema>;

/** Admin edits to a lead. `addNote` appends to the notes history. */
export const leadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES),
    addNote: z.string().trim().min(1).max(1000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const leadListQuerySchema = paginationSchema.extend({
  status: z.enum(LEAD_STATUSES).optional(),
  eventType: z.enum(LEAD_EVENT_TYPES).optional(),
  city: z.string().trim().max(80).optional(),
  q: z.string().trim().max(100).optional(),
});
