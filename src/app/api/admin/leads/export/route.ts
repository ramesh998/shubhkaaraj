import { adminRoute } from "@/lib/api";
import { leadListQuerySchema } from "@/lib/validators/lead";
import { buildLeadFilter, csvCell } from "@/lib/leads-query";
import { Lead } from "@/models/Lead";

const COLUMNS = [
  "createdAt", "name", "phone", "email", "eventType", "eventDate", "city",
  "budget", "guestCount", "status", "message", "utmSource", "utmMedium", "utmCampaign",
] as const;

/** CSV of all leads matching the same filters as the list (capped at 5000 rows). */
export const GET = adminRoute(async (req) => {
  const query = leadListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const leads = await Lead.find(buildLeadFilter(query)).sort({ createdAt: -1 }).limit(5000).lean();

  const rows = leads.map((l) =>
    [
      l.createdAt, l.name, l.phone, l.email, l.eventType, l.eventDate, l.city,
      l.budget, l.guestCount, l.status, l.message, l.utm?.source, l.utm?.medium, l.utm?.campaign,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
