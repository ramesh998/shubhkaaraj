import { ApiError, adminRoute, ok, parseJson } from "@/lib/api";
import { leadUpdateSchema } from "@/lib/validators/lead";
import { objectId } from "@/lib/validators/common";
import { Lead } from "@/models/Lead";

export const GET = adminRoute<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const lead = await Lead.findById(objectId.parse(id)).lean();
  if (!lead) throw new ApiError(404, "Not found");
  return ok(lead);
});

/** Change the status and/or append a note. */
export const PATCH = adminRoute<{ id: string }>(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const { status, addNote } = await parseJson(req, leadUpdateSchema);

  const update: Record<string, unknown> = {};
  if (status) update.$set = { status };
  if (addNote) update.$push = { notes: { text: addNote, by: user.name, createdAt: new Date() } };

  const lead = await Lead.findByIdAndUpdate(objectId.parse(id), update, {
    new: true,
    runValidators: true,
  }).lean();
  if (!lead) throw new ApiError(404, "Not found");
  return ok(lead);
});

export const DELETE = adminRoute<{ id: string }>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const lead = await Lead.findByIdAndDelete(objectId.parse(id)).lean();
  if (!lead) throw new ApiError(404, "Not found");
  return ok({ id });
}, ["admin"]);
