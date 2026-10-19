import type { EventCategory } from "@/lib/constants";

export type ImageVariant = { width: number; webp: string; avif: string };

export type MediaImage = {
  _id?: string;
  baseKey: string;
  url: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
  order: number;
  variants: ImageVariant[];
};

export type PublishStatus = "draft" | "published";
export type LeadStatus = "new" | "contacted" | "booked" | "lost";
export type Role = "admin" | "editor";

export type EventRecord = {
  _id: string;
  title: string;
  slug: string;
  category: EventCategory;
  tags: string[];
  city: string;
  venue?: string;
  eventDate?: string;
  guestCount?: number;
  status: PublishStatus;
  featured: boolean;
  coverImage?: MediaImage;
  images?: MediaImage[];
  story?: string;
  videoUrl?: string;
  seo?: { title?: string; description?: string };
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRecord = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  inclusions: string[];
  images: MediaImage[];
  status: PublishStatus;
  order: number;
  seo?: { title?: string; description?: string };
  updatedAt: string;
};

export type TestimonialRecord = {
  _id: string;
  name: string;
  quote: string;
  eventId?: string;
  eventLabel?: string;
  photo?: MediaImage;
  approved: boolean;
  order: number;
  updatedAt: string;
};

export type LeadNote = { text: string; by?: string; createdAt: string };

export type LeadRecord = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  eventType: string;
  eventDate?: string;
  city?: string;
  budget?: string;
  guestCount?: number;
  message?: string;
  status: LeadStatus;
  notes: LeadNote[];
  utm?: { source?: string; medium?: string; campaign?: string };
  createdAt: string;
};

export type SettingsRecord = {
  businessName?: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  social?: { instagram?: string; facebook?: string; youtube?: string; pinterest?: string };
  hero?: { heading?: string; subheading?: string; videoUrl?: string };
  seo?: { title?: string; description?: string };
};

export type UserRecord = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt?: string;
};

export type ListMeta = { page: number; limit: number; total: number };
