import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { EVENT_CATEGORIES, PUBLISH_STATUSES } from "@/lib/constants";
import { imageSchema } from "./image-schema";

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: EVENT_CATEGORIES, required: true },
    tags: [{ type: String, trim: true, maxlength: 40 }], // e.g. "sangeet", "mehendi"
    city: { type: String, required: true, trim: true, maxlength: 80 },
    venue: { type: String, trim: true, maxlength: 160 },
    eventDate: { type: Date },
    guestCount: { type: Number, min: 0 },
    status: { type: String, enum: PUBLISH_STATUSES, default: "draft" },
    featured: { type: Boolean, default: false },
    coverImage: { type: imageSchema },
    images: { type: [imageSchema], default: [] },
    story: { type: String, maxlength: 5000 },
    videoUrl: { type: String, trim: true, maxlength: 300 },
    seo: {
      title: { type: String, maxlength: 70 },
      description: { type: String, maxlength: 170 },
    },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

// Filtered public galleries and the home page "featured" strip.
eventSchema.index({ status: 1, category: 1, city: 1, eventDate: -1 });
eventSchema.index({ status: 1, featured: 1, eventDate: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const Event: Model<EventDoc> =
  (models.Event as Model<EventDoc>) || model<EventDoc>("Event", eventSchema);
