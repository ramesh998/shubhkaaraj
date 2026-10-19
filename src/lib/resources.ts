import { makeCrud } from "./crud";
import {
  eventCreateSchema,
  eventUpdateSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
  testimonialCreateSchema,
  testimonialUpdateSchema,
} from "./validators/content";
import { Event } from "@/models/Event";
import { Service } from "@/models/Service";
import { Testimonial } from "@/models/Testimonial";

const asBool = (raw: string) => raw === "true";

export const events = makeCrud({
  model: Event,
  tag: "events",
  createSchema: eventCreateSchema,
  updateSchema: eventUpdateSchema,
  slugFrom: "title",
  searchFields: ["title", "city", "venue"],
  filters: { status: (r) => r, category: (r) => r, city: (r) => r, featured: asBool },
  defaultSort: { eventDate: -1, createdAt: -1 },
  listExclude: ["images"], // galleries can be large; fetch one event to see them
  imageFields: ["images", "coverImage"],
  beforeSave(doc) {
    // Stamp the first publish date; keep it if the event is unpublished and republished.
    if (doc.status === "published" && !doc.publishedAt) doc.publishedAt = new Date();
  },
});

export const services = makeCrud({
  model: Service,
  tag: "services",
  createSchema: serviceCreateSchema,
  updateSchema: serviceUpdateSchema,
  slugFrom: "title",
  searchFields: ["title", "summary"],
  filters: { status: (r) => r },
  defaultSort: { order: 1, createdAt: -1 },
  imageFields: ["images"],
});

export const testimonials = makeCrud({
  model: Testimonial,
  tag: "testimonials",
  createSchema: testimonialCreateSchema,
  updateSchema: testimonialUpdateSchema,
  searchFields: ["name", "quote"],
  filters: { approved: asBool },
  defaultSort: { order: 1, createdAt: -1 },
  imageFields: ["photo"],
});
