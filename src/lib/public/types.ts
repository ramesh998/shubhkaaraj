import type { EventCategory } from "@/lib/constants";

export type PublicImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
  blur?: string;
  variants: { width: number; webp: string; avif: string }[];
};

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  city: string;
  venue?: string;
  eventDate?: string;
  guestCount?: number;
  tags: string[];
  featured: boolean;
  cover?: PublicImage;
  images: PublicImage[];
  story?: string;
  videoUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: string;
};

export type PublicService = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  inclusions: string[];
  images: PublicImage[];
  seoTitle?: string;
  seoDescription?: string;
};

export type PublicTestimonial = {
  id: string;
  name: string;
  quote: string;
  eventLabel?: string;
  photo?: PublicImage;
};

export type PublicSettings = {
  businessName: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  social: { instagram?: string; facebook?: string; youtube?: string; pinterest?: string };
  hero: { heading?: string; subheading?: string };
  seoTitle?: string;
  seoDescription?: string;
};
