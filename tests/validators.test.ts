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
