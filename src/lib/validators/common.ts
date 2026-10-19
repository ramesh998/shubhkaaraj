import { z } from "zod";
import { Types } from "mongoose";

export const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v) && /^[a-f\d]{24}$/i.test(v), "Invalid id");

const trimmed = (max: number) => z.string().trim().max(max);

export const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/** Indian-friendly phone: optional +, 10-14 digits, spaces/dashes tolerated on input. */
export const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .refine((v) => /^\+?\d{10,14}$/.test(v), "Enter a valid phone number");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
  .max(120);

export const seoSchema = z
  .object({
    title: optionalText(70),
    description: optionalText(170),
  })
  .optional();

export const imageVariantSchema = z.object({
  width: z.number().int().positive(),
  webp: z.string().min(1),
  avif: z.string().min(1),
});

export const imageSchema = z.object({
  baseKey: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurDataURL: z.string().max(4000).optional(),
  alt: trimmed(200).default(""),
  order: z.number().int().default(0),
  variants: z.array(imageVariantSchema).default([]),
});
export type ImageInput = z.infer<typeof imageSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
