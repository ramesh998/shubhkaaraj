import { adminRoute, ok } from "@/lib/api";

export const GET = adminRoute(async (_req, _ctx, user) => ok(user));
