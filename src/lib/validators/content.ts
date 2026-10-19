import { z } from "zod";
import { EVENT_CATEGORIES, PUBLISH_STATUSES } from "@/lib/constants";
import {
  clearable,
  imageSchema,
  objectId,
  optionalText,
  seoSchema,
  slugSchema,
} from "./common";

/*
 * IMPORTANT: update (PATCH) schemas are built from the *default-free* shape.
 * Zod applies `.default()` even inside `.partial()`, so deriving an update schema from
 * the create schema would silently reset status, images, tags, etc. on every partial
 * update. Defaults live only in the create schemas (via `.extend`).
 */

const httpUrl = clearable(
  z
    .string()
    .trim()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) URL")
    .max(300),
);

/* ---------------------------------- Events --------------------------------- */

const eventShape = z.object({
  title: z.string().trim().min(2).max(160),
  slug: slugSchema, // generated from the title on create when omitted
  category: z.enum(EVENT_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(15),
  city: z.string().trim().min(2).max(80),
  venue: optionalText(160),
  eventDate: clearable(z.coerce.date()),
  guestCount: clearable(z.coerce.number().int().min(0).max(100000)),
  status: z.enum(PUBLISH_STATUSES),
  featured: z.boolean(),
  coverImage: clearable(imageSchema),
  images: z.array(imageSchema).max(120),
  story: optionalText(5000),
  videoUrl: httpUrl,
  seo: seoSchema,
});

export const eventCreateSchema = eventShape.extend({
  slug: eventShape.shape.slug.optional(),
  tags: eventShape.shape.tags.default([]),
  status: eventShape.shape.status.default("draft"),
  featured: eventShape.shape.featured.default(false),
  images: eventShape.shape.images.default([]),
});
export const eventUpdateSchema = eventShape.partial();
export type EventInput = z.infer<typeof eventCreateSchema>;

/* --------------------------------- Services -------------------------------- */

const serviceShape = z.object({
  title: z.string().trim().min(2).max(120),
  slug: slugSchema,
  summary: optionalText(300),
  description: optionalText(5000),
  inclusions: z.array(z.string().trim().min(1).max(200)).max(30),
  images: z.array(imageSchema).max(30),
  status: z.enum(PUBLISH_STATUSES),
  order: z.number().int(),
  seo: seoSchema,
});

export const serviceCreateSchema = serviceShape.extend({
  slug: serviceShape.shape.slug.optional(),
  inclusions: serviceShape.shape.inclusions.default([]),
  images: serviceShape.shape.images.default([]),
  status: serviceShape.shape.status.default("draft"),
  order: serviceShape.shape.order.default(0),
});
export const serviceUpdateSchema = serviceShape.partial();

/* ------------------------------- Testimonials ------------------------------ */

const testimonialShape = z.object({
  name: z.string().trim().min(2).max(100),
  quote: z.string().trim().min(10).max(1000),
  eventId: clearable(objectId),
  eventLabel: optionalText(120),
  photo: clearable(imageSchema),
  approved: z.boolean(),
  order: z.number().int(),
});

export const testimonialCreateSchema = testimonialShape.extend({
  approved: testimonialShape.shape.approved.default(false),
  order: testimonialShape.shape.order.default(0),
});
export const testimonialUpdateSchema = testimonialShape.partial();

/* --------------------------------- Settings -------------------------------- */

const handleOrUrl = optionalText(300);

/** PUT body. No defaults: only the fields sent are changed (the model supplies defaults). */
export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100).optional(),
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
