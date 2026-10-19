import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { LEAD_EVENT_TYPES, LEAD_STATUSES } from "@/lib/constants";

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    eventType: { type: String, enum: LEAD_EVENT_TYPES, required: true },
    eventDate: { type: Date },
    city: { type: String, trim: true, maxlength: 80 },
    budget: { type: String, trim: true, maxlength: 60 },
    guestCount: { type: Number, min: 0 },
    message: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: LEAD_STATUSES, default: "new" },
    notes: [
      {
        text: { type: String, required: true, maxlength: 1000 },
        by: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Marketing attribution, captured by the form from the page URL.
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },
    pageUrl: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema>;
export const Lead: Model<LeadDoc> =
  (models.Lead as Model<LeadDoc>) || model<LeadDoc>("Lead", leadSchema);
