import { describe, expect, it } from "vitest";
import { leadCreateSchema, leadUpdateSchema } from "@/lib/validators/lead";
import { eventCreateSchema } from "@/lib/validators/content";
import { loginSchema, passwordSchema } from "@/lib/validators/auth";
import { objectId } from "@/lib/validators/common";

describe("leadCreateSchema", () => {
  const base = { name: "Asha Rao", phone: "+91 98765-43210", eventType: "wedding-decor" };

  it("accepts a minimal lead and normalises the phone", () => {
    const r = leadCreateSchema.parse(base);
    expect(r.phone).toBe("+919876543210");
  });
  it("treats empty optional strings as missing", () => {
    const r = leadCreateSchema.parse({ ...base, email: "", eventDate: "", city: "" });
    expect(r.email).toBeUndefined();
    expect(r.eventDate).toBeUndefined();
    expect(r.city).toBeUndefined();
  });
  it("rejects bad phone, bad type and bad email", () => {
    expect(leadCreateSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...base, eventType: "birthday" }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });
  it("coerces numeric strings from form posts", () => {
    expect(leadCreateSchema.parse({ ...base, guestCount: "250" }).guestCount).toBe(250);
  });
});

describe("leadUpdateSchema", () => {
  it("requires something to change", () => {
    expect(leadUpdateSchema.safeParse({}).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ status: "booked" }).success).toBe(true);
    expect(leadUpdateSchema.safeParse({ status: "weird" }).success).toBe(false);
  });
});

describe("eventCreateSchema", () => {
  const base = { title: "Royal Mandap", category: "wedding-decor", city: "Udaipur" };
  it("applies defaults", () => {
    const r = eventCreateSchema.parse(base);
    expect(r.status).toBe("draft");
    expect(r.featured).toBe(false);
    expect(r.images).toEqual([]);
  });
  it("rejects non-http video URLs and bad slugs", () => {
    expect(eventCreateSchema.safeParse({ ...base, videoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(eventCreateSchema.safeParse({ ...base, slug: "Not A Slug" }).success).toBe(false);
    expect(eventCreateSchema.safeParse({ ...base, videoUrl: "https://youtu.be/abc" }).success).toBe(true);
  });
});

describe("auth validators", () => {
  it("normalises login email", () => {
    expect(loginSchema.parse({ email: "  A@B.COM ", password: "x" }).email).toBe("a@b.com");
  });
  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletterslong").success).toBe(false);
    expect(passwordSchema.safeParse("goodpassword123").success).toBe(true);
  });
});

describe("objectId", () => {
  it("accepts 24-hex ids only", () => {
    expect(objectId.safeParse("507f1f77bcf86cd799439011").success).toBe(true);
    expect(objectId.safeParse("123456789012").success).toBe(false); // 12-char strings are ObjectId-valid in bson
    expect(objectId.safeParse("not-an-id").success).toBe(false);
  });
});

describe("clearing fields in a PATCH", () => {
  it("accepts empty values and keeps the keys so Mongoose can unset them", async () => {
    const { eventUpdateSchema, testimonialUpdateSchema } = await import("@/lib/validators/content");
    const r = eventUpdateSchema.parse({
      venue: "", story: "", videoUrl: "", guestCount: null, eventDate: "", coverImage: null,
    });
    for (const k of ["venue", "story", "videoUrl", "guestCount", "eventDate", "coverImage"]) {
      expect(k in r, `${k} should be present`).toBe(true);
      expect((r as Record<string, unknown>)[k]).toBeUndefined();
    }
    const t = testimonialUpdateSchema.parse({ eventId: "", photo: null });
    expect("eventId" in t && "photo" in t).toBe(true);
  });
  it("still validates real values", async () => {
    const { eventUpdateSchema } = await import("@/lib/validators/content");
    expect(eventUpdateSchema.parse({ guestCount: "250", eventDate: "2026-02-14" }).guestCount).toBe(250);
    expect(eventUpdateSchema.safeParse({ eventDate: "not a date" }).success).toBe(false);
    expect(eventUpdateSchema.safeParse({ guestCount: -5 }).success).toBe(false);
    expect(eventUpdateSchema.safeParse({ videoUrl: "ftp://x.y/z" }).success).toBe(false);
  });
});

describe("partial updates never inject defaults (regression: PATCH {featured:true} reset status and images)", () => {
  it("returns only the keys that were sent", async () => {
    const { eventUpdateSchema, serviceUpdateSchema, testimonialUpdateSchema, settingsSchema } = await import(
      "@/lib/validators/content"
    );
    expect(eventUpdateSchema.parse({ featured: true })).toEqual({ featured: true });
    expect(eventUpdateSchema.parse({ title: "New title" })).toEqual({ title: "New title" });
    expect(serviceUpdateSchema.parse({ status: "published" })).toEqual({ status: "published" });
    expect(testimonialUpdateSchema.parse({ approved: true })).toEqual({ approved: true });
    expect(settingsSchema.parse({ phone: "+91 90000 00000" })).toEqual({ phone: "+91 90000 00000" });
  });
  it("create schemas still apply their defaults", async () => {
    const { eventCreateSchema, serviceCreateSchema, testimonialCreateSchema } = await import(
      "@/lib/validators/content"
    );
    const e = eventCreateSchema.parse({ title: "Royal Mandap", category: "wedding-decor", city: "Udaipur" });
    expect(e).toMatchObject({ status: "draft", featured: false, images: [], tags: [] });
    expect(serviceCreateSchema.parse({ title: "Wedding decor" })).toMatchObject({ status: "draft", order: 0, images: [], inclusions: [] });
    expect(testimonialCreateSchema.parse({ name: "Asha", quote: "Wonderful work, thank you!" })).toMatchObject({ approved: false, order: 0 });
  });
});
