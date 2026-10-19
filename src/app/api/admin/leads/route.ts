import { adminRoute, okList } from "@/lib/api";
import { leadListQuerySchema } from "@/lib/validators/lead";
import { buildLeadFilter } from "@/lib/leads-query";
import { Lead } from "@/models/Lead";

export const GET = adminRoute(async (req) => {
  const query = leadListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const filter = buildLeadFilter(query);
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);
  return okList(items, { page: query.page, limit: query.limit, total });
});
