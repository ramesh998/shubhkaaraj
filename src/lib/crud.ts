import type { NextRequest } from "next/server";
import type { Model } from "mongoose";
import type { ZodType } from "zod";
import { ApiError, ok, okList, parseJson, adminRoute } from "./api";
import { objectId, paginationSchema } from "./validators/common";
import { uniqueSlug } from "./slug";
import { revalidateContent, type ContentTag } from "./revalidate";
import { deleteObjects } from "./storage";
import { keysForImage } from "./images";

type AnyDoc = Record<string, unknown> & { _id: unknown; save(): Promise<unknown> };
type ImageLike = { baseKey: string; variants?: { width: number }[] | null };

export type CrudConfig = {
  // The factory is deliberately model-agnostic; each model's own schema validates writes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  tag: ContentTag;
  createSchema: ZodType<Record<string, unknown>>;
  updateSchema: ZodType<Record<string, unknown>>;
  /** Field the slug is generated from (also enables slug handling). */
  slugFrom?: string;
  /** Text fields searched by `?q=`. */
  searchFields?: string[];
  /** Exact-match filters allowed in the query string, with their parsers. */
  filters?: Record<string, (raw: string) => unknown>;
  defaultSort?: Record<string, 1 | -1>;
  /** Fields left out of list responses (e.g. heavy image arrays). */
  listExclude?: string[];
  /** Adjust a document right before it is saved. */
  beforeSave?: (doc: Record<string, unknown>, previous: Record<string, unknown> | null) => void;
  /** Image fields whose files should be deleted along with the record. */
  imageFields?: string[];
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function collectImages(doc: Record<string, unknown>, fields: string[]): ImageLike[] {
  const out: ImageLike[] = [];
  for (const f of fields) {
    const v = doc[f];
    if (Array.isArray(v)) out.push(...(v as ImageLike[]));
    else if (v && typeof v === "object") out.push(v as ImageLike);
  }
  return out;
}

async function cleanupRemovedImages(
  before: ImageLike[],
  after: ImageLike[],
) {
  const keep = new Set(after.flatMap(keysForImage));
  const gone = before.flatMap(keysForImage).filter((k) => !keep.has(k));
  if (gone.length) await deleteObjects(gone).catch((e) => console.error("[media] cleanup failed:", e));
}

export function makeCrud(cfg: CrudConfig) {
  const {
    model,
    tag,
    createSchema,
    updateSchema,
    slugFrom,
    searchFields = [],
    filters = {},
    defaultSort = { createdAt: -1 },
    listExclude = [],
    beforeSave,
    imageFields = [],
  } = cfg;

  const slugTaken = (exceptId?: string) => async (candidate: string) =>
    !!(await model.exists({ slug: candidate, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }));

  const list = adminRoute(async (req: NextRequest) => {
    const sp = req.nextUrl.searchParams;
    const { page, limit } = paginationSchema.parse(Object.fromEntries(sp));
    const query: Record<string, unknown> = {};

    for (const [key, parse] of Object.entries(filters)) {
      const raw = sp.get(key);
      if (raw !== null && raw !== "") query[key] = parse(raw);
    }
    const q = sp.get("q")?.trim().slice(0, 100);
    if (q && searchFields.length) {
      const rx = new RegExp(escapeRegex(q), "i");
      query.$or = searchFields.map((f) => ({ [f]: rx }));
    }

    const projection = listExclude.length
      ? Object.fromEntries(listExclude.map((f) => [f, 0]))
      : undefined;
    const [items, total] = await Promise.all([
      model
        .find(query, projection)
        .sort(defaultSort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      model.countDocuments(query),
    ]);
    return okList(items, { page, limit, total });
  });

  const create = adminRoute(async (req: NextRequest) => {
    const body = { ...(await parseJson(req, createSchema)) };
    if (slugFrom) {
      const source = String(body[slugFrom] ?? "");
      body.slug = body.slug
        ? String(body.slug)
        : await uniqueSlug(source, slugTaken());
    }
    const doc = new model(body) as unknown as AnyDoc;
    beforeSave?.(doc as unknown as Record<string, unknown>, null);
    await doc.save();
    revalidateContent(tag);
    return ok(doc, { status: 201 });
  });

  const getOne = adminRoute<{ id: string }>(async (_req, ctx) => {
    const { id } = await ctx.params;
    const doc = await model.findById(objectId.parse(id)).lean();
    if (!doc) throw new ApiError(404, "Not found");
    return ok(doc);
  });

  const update = adminRoute<{ id: string }>(async (req, ctx) => {
    const { id } = await ctx.params;
    const patch = await parseJson(req, updateSchema);
    const doc = (await model.findById(objectId.parse(id))) as unknown as AnyDoc | null;
    if (!doc) throw new ApiError(404, "Not found");

    const previous = doc.toObject ? (doc as unknown as { toObject(): Record<string, unknown> }).toObject() : {};
    const imagesBefore = collectImages(previous, imageFields);

    if (slugFrom && typeof patch.slug === "string" && patch.slug !== doc.slug) {
      if (await slugTaken(id)(patch.slug)) {
        throw new ApiError(409, "That slug is already in use");
      }
    }
    (doc as unknown as { set(v: unknown): void }).set(patch);
    beforeSave?.(doc as unknown as Record<string, unknown>, previous);
    await doc.save();

    const after = (doc as unknown as { toObject(): Record<string, unknown> }).toObject();
    await cleanupRemovedImages(imagesBefore, collectImages(after, imageFields));
    revalidateContent(tag);
    return ok(doc);
  });

  const remove = adminRoute<{ id: string }>(async (_req, ctx) => {
    const { id } = await ctx.params;
    const doc = await model.findByIdAndDelete(objectId.parse(id)).lean();
    if (!doc) throw new ApiError(404, "Not found");
    await cleanupRemovedImages(collectImages(doc as Record<string, unknown>, imageFields), []);
    revalidateContent(tag);
    return ok({ id });
  });

  return { list, create, getOne, update, remove };
}
