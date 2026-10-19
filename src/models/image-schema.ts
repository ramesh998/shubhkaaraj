import { Schema } from "mongoose";

/** Embedded image document shared by events, services and testimonials. */
export const imageSchema = new Schema(
  {
    baseKey: { type: String, required: true },
    url: { type: String, required: true }, // largest WebP, safe default for <img>
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    blurDataURL: { type: String },
    alt: { type: String, default: "", maxlength: 200 },
    order: { type: Number, default: 0 },
    variants: [
      {
        _id: false,
        width: { type: Number, required: true },
        webp: { type: String, required: true },
        avif: { type: String, required: true },
      },
    ],
  },
  { _id: true },
);
