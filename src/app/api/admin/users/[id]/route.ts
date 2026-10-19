import { ApiError, adminRoute, ok, parseJson } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validators/auth";
import { objectId } from "@/lib/validators/common";
import { hashPassword } from "@/lib/password";
import { User } from "@/models/User";

/** Update name / role / active flag, or reset the password. Admin-only. */
export const PATCH = adminRoute<{ id: string }>(async (req, ctx, me) => {
  const { id } = await ctx.params;
  const { password, ...rest } = await parseJson(req, userUpdateSchema);
  const target = await User.findById(objectId.parse(id));
  if (!target) throw new ApiError(404, "Not found");

  // Prevent locking yourself (or the last admin) out.
  const demotesOrDisables = rest.active === false || (rest.role && rest.role !== "admin");
  if (target.role === "admin" && demotesOrDisables) {
    const otherAdmins = await User.countDocuments({ role: "admin", active: true, _id: { $ne: target._id } });
    if (otherAdmins === 0) throw new ApiError(400, "There must be at least one active admin");
  }

  target.set(rest);
  if (password) target.passwordHash = await hashPassword(password);
  // Any security-relevant change signs the user out everywhere.
  if (password || rest.active === false || rest.role) target.tokenVersion += 1;
  await target.save();
  void me;

  return ok({ id: String(target._id), name: target.name, email: target.email, role: target.role, active: target.active });
}, ["admin"]);

export const DELETE = adminRoute<{ id: string }>(async (_req, ctx, me) => {
  const { id } = await ctx.params;
  if (id === me.id) throw new ApiError(400, "You cannot delete your own account");
  const target = await User.findById(objectId.parse(id));
  if (!target) throw new ApiError(404, "Not found");
  if (target.role === "admin") {
    const otherAdmins = await User.countDocuments({ role: "admin", active: true, _id: { $ne: target._id } });
    if (otherAdmins === 0) throw new ApiError(400, "There must be at least one active admin");
  }
  await target.deleteOne();
  return ok({ id });
}, ["admin"]);
