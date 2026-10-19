import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";
import { buildLeadFilter, csvCell } from "@/lib/leads-query";

describe("slugify", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(slugify("Royal Wedding – Udaipur!")).toBe("royal-wedding-udaipur");
    expect(slugify("Café  Déjà Vu")).toBe("cafe-deja-vu");
  });
  it("returns empty for symbol-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("appends a counter until free", async () => {
    const taken = new Set(["sangeet-night", "sangeet-night-2"]);
    expect(await uniqueSlug("Sangeet Night", async (s) => taken.has(s))).toBe("sangeet-night-3");
  });
  it("falls back for empty slugs", async () => {
    expect(await uniqueSlug("!!!", async () => false)).toBe("item");
  });
});

describe("csvCell", () => {
  it("quotes and escapes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toMatch(/^"'=/);
    expect(csvCell("+91 98765")).toBe(`"'+91 98765"`);
  });
  it("handles null and dates", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(new Date("2026-01-02T03:04:05Z"))).toBe('"2026-01-02T03:04:05.000Z"');
  });
});

describe("buildLeadFilter", () => {
  it("escapes regex characters in search", () => {
    const f = buildLeadFilter({ q: "a.b(c" }) as { $or: { name: RegExp }[] };
    expect(f.$or[0].name.test("a.b(c")).toBe(true);
    expect(f.$or[0].name.test("aXb(c")).toBe(false);
  });
  it("applies exact filters", () => {
    expect(buildLeadFilter({ status: "new", eventType: "other" })).toEqual({
      status: "new",
      eventType: "other",
    });
  });
});
