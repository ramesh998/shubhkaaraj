import { z } from "zod";
import { EVENT_CATEGORIES, PUBLISH_STATUSES } from "@/lib/constants";
import {
  imageSchema,
  objectId,
  optionalText,
  seoSchema,
  slugSchema,
} from "./common";

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) URL")
  .max(300);

/* ---------------------------------- Events --------------------------------- */

export const eventCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: slugSchema.optional(), // generated from the title when omitted
  category: z.enum(EVENT_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  city: z.string().trim().min(2).max(80),
  venue: optionalText(160),
  eventDate: z.coerce.date().optional(),
  guestCount: z.number().int().min(0).max(100000).optional(),
  status: z.enum(PUBLISH_STATUSES).default("draft"),
  featured: z.boolean().default(false),
  coverImage: imageSchema.optional(),
  images: z.array(imageSchema).max(120).default([]),
  story: optionalText(5000),
  videoUrl: httpUrl.optional(),
  seo: seoSchema,
});
export const eventUpdateSchema = eventCreateSchema.partial();
export type EventInput = z.infer<typeof eventCreateSchema>;

/* --------------------------------- Services -------------------------------- */

export const serviceCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  summary: optionalText(300),
  description: optionalText(5000),
  inclusions: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  images: z.array(imageSchema).max(30).default([]),
  status: z.enum(PUBLISH_STATUSES).default("draft"),
  order: z.number().int().default(0),
  seo: seoSchema,
});
export const serviceUpdateSchema = serviceCreateSchema.partial();

/* ------------------------------- Testimonials ------------------------------ */

export const testimonialCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  quote: z.string().trim().min(10).max(1000),
  eventId: objectId.optional(),
  eventLabel: optionalText(120),
  photo: imageSchema.optional(),
  approved: z.boolean().default(false),
  order: z.number().int().default(0),
});
export const testimonialUpdateSchema = testimonialCreateSchema.partial();

/* --------------------------------- Settings -------------------------------- */

const handleOrUrl = optionalText(300);

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100).default("ShubhKaaraj"),
  tagline: optionalText(160),
  phone: optionalText(20),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Digits only, with country code (e.g. 919876543210)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z.string().trim().email().max(200).optional().or(z.literal("").transform(() => undefined)),
  address: optionalText(300),
  social: z
    .object({
      instagram: handleOrUrl,
      facebook: handleOrUrl,
      youtube: handleOrUrl,
      pinterest: handleOrUrl,
    })
    .optional(),
  hero: z
    .object({
      heading: optionalText(160),
      subheading: optionalText(300),
      videoUrl: optionalText(300),
    })
    .optional(),
  seo: seoSchema,
});
