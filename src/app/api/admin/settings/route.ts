import { adminRoute, ok, parseJson } from "@/lib/api";
import { settingsSchema } from "@/lib/validators/content";
import { revalidateContent } from "@/lib/revalidate";
import { SiteSettings } from "@/models/SiteSettings";

export const GET = adminRoute(async () => {
  const doc = await SiteSettings.findOne({ key: "site" }).lean();
  return ok(doc ?? { key: "site", businessName: "ShubhKaaraj" });
});

/**
 * Upserts the single settings document.
 * Fields that are present in the body are set; fields sent empty are removed;
 * fields not sent at all are left alone. Nested groups (social, hero, seo) are replaced whole.
 */
export const PUT = adminRoute(async (req) => {
  const data = await parseJson(req, settingsSchema);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) $unset[key] = 1;
    else $set[key] = value;
  }
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  const doc = await SiteSettings.findOneAndUpdate({ key: "site" }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  }).lean();
  revalidateContent("settings");
  return ok(doc);
});
