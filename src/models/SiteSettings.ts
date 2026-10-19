import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

/** Single-document collection (key is always "site"). */
const siteSettingsSchema = new Schema(
  {
    key: { type: String, default: "site", unique: true },
    businessName: { type: String, default: "ShubhKaaraj" },
    tagline: { type: String, maxlength: 160 },
    phone: { type: String, maxlength: 20 },
    whatsapp: { type: String, maxlength: 20 }, // digits with country code, e.g. 919876543210
    email: { type: String, maxlength: 200 },
    address: { type: String, maxlength: 300 },
    social: {
      instagram: String,
      facebook: String,
      youtube: String,
      pinterest: String,
    },
    hero: {
      heading: { type: String, maxlength: 160 },
      subheading: { type: String, maxlength: 300 },
      videoUrl: { type: String, maxlength: 300 },
    },
    seo: {
      title: { type: String, maxlength: 70 },
      description: { type: String, maxlength: 170 },
    },
  },
  { timestamps: true },
);

export type SiteSettingsDoc = InferSchemaType<typeof siteSettingsSchema>;
export const SiteSettings: Model<SiteSettingsDoc> =
  (models.SiteSettings as Model<SiteSettingsDoc>) ||
  model<SiteSettingsDoc>("SiteSettings", siteSettingsSchema);
