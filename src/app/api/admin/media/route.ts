import { z } from "zod";
import { ApiError, adminRoute, ok, parseJson } from "@/lib/api";
import { MAX_FILES_PER_UPLOAD, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { processImage } from "@/lib/images";
import { deleteObjects, isValidKey, putObject } from "@/lib/storage";

const FOLDERS = ["events", "services", "testimonials"] as const;

/**
 * Upload one or more images (multipart field "files").
 * Returns image documents ready to embed in an event / service / testimonial.
 * Nothing is attached to a record here; the admin form saves them with the record.
 */
export const POST = adminRoute(async (req) => {
  const form = await req.formData();
  const folder = String(form.get("folder") ?? "events");
  if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) {
    throw new ApiError(400, "Unknown folder");
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) throw new ApiError(400, 'Attach at least one image in the "files" field');
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new ApiError(400, `Upload at most ${MAX_FILES_PER_UPLOAD} images at a time`);
  }
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(413, `"${f.name}" is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
    }
  }

  const images = [];
  const written: string[] = [];
  try {
    for (const [i, f] of files.entries()) {
      const processed = await processImage(Buffer.from(await f.arrayBuffer()), {
        folder,
        order: i,
        alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 200),
      });
      for (const file of processed.files) {
        await putObject(file);
        written.push(file.key);
      }
      images.push(processed.image);
    }
  } catch (err) {
    // All-or-nothing: do not leave orphaned files behind a failed batch.
    await deleteObjects(written).catch(() => undefined);
    throw err;
  }
  return ok(images, { status: 201 });
});

const deleteSchema = z.object({ keys: z.array(z.string()).min(1).max(200) });

/** Removes files by storage key (e.g. an uploaded image the user discarded before saving). */
export const DELETE = adminRoute(async (req) => {
  const { keys } = await parseJson(req, deleteSchema);
  if (!keys.every(isValidKey)) throw new ApiError(400, "Invalid storage key");
  await deleteObjects(keys);
  return ok({ deleted: keys.length });
});
