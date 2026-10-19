export const EVENT_CATEGORIES = [
  "wedding-decor",
  "wedding-planning",
  "corporate-decor",
  "corporate-planning",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const LEAD_EVENT_TYPES = [...EVENT_CATEGORIES, "other"] as const;

export const PUBLISH_STATUSES = ["draft", "published"] as const;

export const LEAD_STATUSES = ["new", "contacted", "booked", "lost"] as const;

export const USER_ROLES = ["admin", "editor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SESSION_COOKIE = "sk_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Widths generated for every uploaded image. */
export const IMAGE_WIDTHS = [640, 1280, 1920] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;
