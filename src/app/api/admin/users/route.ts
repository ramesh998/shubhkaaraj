import { adminRoute, ok, parseJson } from "@/lib/api";
import { userCreateSchema } from "@/lib/validators/auth";
import { hashPassword } from "@/lib/password";
import { User } from "@/models/User";

// User management is admin-only (editors, such as a partner, cannot add or remove people).

export const GET = adminRoute(
  async () => ok(await User.find().sort({ createdAt: 1 }).lean()),
  ["admin"],
);

export const POST = adminRoute(async (req) => {
  const { password, ...rest } = await parseJson(req, userCreateSchema);
  const user = await User.create({ ...rest, passwordHash: await hashPassword(password) });
  return ok(
    { id: String(user._id), name: user.name, email: user.email, role: user.role, active: user.active },
    { status: 201 },
  );
}, ["admin"]);
