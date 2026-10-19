import sharp, { type Metadata } from "sharp";
import { randomUUID } from "node:crypto";
import { IMAGE_WIDTHS, MAX_UPLOAD_BYTES } from "./constants";
import { ApiError } from "./api";
import { publicUrl } from "./storage";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const MAX_WIDTH = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

export type ProcessedImage = {
  /** Document to embed in events/services/testimonials. */
  image: {
    baseKey: string;
    url: string;
    width: number;
    height: number;
    blurDataURL: string;
    alt: string;
    order: number;
    variants: { width: number; webp: string; avif: string }[];
  };
  /** Files that must be written to storage. */
  files: { key: string; body: Buffer; contentType: string }[];
};

/** Widths to generate for an image of the given width (never upscales). */
export function variantWidths(originalWidth: number): number[] {
  const widths = IMAGE_WIDTHS.filter((w) => w < originalWidth) as number[];
  widths.push(Math.min(originalWidth, MAX_WIDTH));
  return [...new Set(widths)].sort((a, b) => a - b);
}

/** Every storage key belonging to an embedded image (used for deletion). */
export function keysForImage(img: {
  baseKey: string;
  variants?: { width: number }[] | null;
}): string[] {
  return (img.variants ?? []).flatMap((v) => [
    `${img.baseKey}/${v.width}.webp`,
    `${img.baseKey}/${v.width}.avif`,
  ]);
}

/**
 * Validates the upload really is an image, auto-orients it, strips metadata,
 * and renders WebP + AVIF at several widths plus a tiny blur placeholder.
 */
export async function processImage(
  input: Buffer,
  opts: { folder: string; alt?: string; order?: number },
): Promise<ProcessedImage> {
  if (input.length === 0) throw new ApiError(400, "Empty file");
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, `Image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  }

  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ApiError(415, "File is not a readable image");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ApiError(415, "Only JPEG, PNG, WebP and AVIF images are supported");
  }

  // Dimensions after EXIF rotation (orientation 5-8 swaps width and height).
  const swapped = (meta.orientation ?? 1) >= 5;
  const srcWidth = (swapped ? meta.height : meta.width) ?? 0;
  const srcHeight = (swapped ? meta.width : meta.height) ?? 0;
  if (!srcWidth || !srcHeight) throw new ApiError(415, "Could not read image dimensions");

  const baseKey = `${opts.folder}/${randomUUID()}`;
  const widths = variantWidths(srcWidth);
  const base = sharp(input).rotate(); // honours EXIF orientation, drops metadata on output

  const files: ProcessedImage["files"] = [];
  const variants: ProcessedImage["image"]["variants"] = [];

  for (const width of widths) {
    const resized = base.clone().resize({ width, withoutEnlargement: true });
    const [webp, avif] = await Promise.all([
      resized.clone().webp({ quality: 80 }).toBuffer(),
      resized.clone().avif({ quality: 55, effort: 3 }).toBuffer(),
    ]);
    const webpKey = `${baseKey}/${width}.webp`;
    const avifKey = `${baseKey}/${width}.avif`;
    files.push(
      { key: webpKey, body: webp, contentType: "image/webp" },
      { key: avifKey, body: avif, contentType: "image/avif" },
    );
    variants.push({ width, webp: publicUrl(webpKey), avif: publicUrl(avifKey) });
  }

  const blur = await base
    .clone()
    .resize({ width: 16 })
    .webp({ quality: 40 })
    .toBuffer();

  const largest = variants[variants.length - 1];
  const height = Math.round((srcHeight / srcWidth) * widths[widths.length - 1]);

  return {
    image: {
      baseKey,
      url: largest.webp,
      width: widths[widths.length - 1],
      height,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      alt: opts.alt ?? "",
      order: opts.order ?? 0,
      variants,
    },
    files,
  };
}
