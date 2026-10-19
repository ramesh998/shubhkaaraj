import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { imageSchema } from "./image-schema";

const testimonialSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    quote: { type: String, required: true, trim: true, maxlength: 1000 },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    eventLabel: { type: String, trim: true, maxlength: 120 }, // e.g. "Wedding, Udaipur"
    photo: { type: imageSchema },
    approved: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

testimonialSchema.index({ approved: 1, order: 1 });

export type TestimonialDoc = InferSchemaType<typeof testimonialSchema>;
export const Testimonial: Model<TestimonialDoc> =
  (models.Testimonial as Model<TestimonialDoc>) ||
  model<TestimonialDoc>("Testimonial", testimonialSchema);
