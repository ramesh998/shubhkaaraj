import { adminRoute, ok, parseJson } from "@/lib/api";
import { settingsSchema } from "@/lib/validators/content";
import { revalidateContent } from "@/lib/revalidate";
import { SiteSettings } from "@/models/SiteSettings";

export const GET = adminRoute(async () => {
  const doc = await SiteSettings.findOne({ key: "site" }).lean();
  return ok(doc ?? { key: "site", businessName: "ShubhKaaraj" });
});

/** Upserts the single settings document with the fields provided. */
export const PUT = adminRoute(async (req) => {
  const data = await parseJson(req, settingsSchema);
  const doc = await SiteSettings.findOneAndUpdate(
    { key: "site" },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).lean();
  revalidateContent("settings");
  return ok(doc);
});
