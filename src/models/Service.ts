import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { PUBLISH_STATUSES } from "@/lib/constants";
import { imageSchema } from "./image-schema";

const serviceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    summary: { type: String, trim: true, maxlength: 300 },
    description: { type: String, maxlength: 5000 },
    inclusions: [{ type: String, trim: true, maxlength: 200 }],
    images: { type: [imageSchema], default: [] },
    status: { type: String, enum: PUBLISH_STATUSES, default: "draft" },
    order: { type: Number, default: 0 },
    seo: {
      title: { type: String, maxlength: 70 },
      description: { type: String, maxlength: 170 },
    },
  },
  { timestamps: true },
);

serviceSchema.index({ status: 1, order: 1 });

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;
export const Service: Model<ServiceDoc> =
  (models.Service as Model<ServiceDoc>) || model<ServiceDoc>("Service", serviceSchema);
