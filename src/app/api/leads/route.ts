import { after } from "next/server";
import { ApiError, ok, parseJson, publicRoute } from "@/lib/api";
import { leadCreateSchema } from "@/lib/validators/lead";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { buildAutoReply, buildLeadNotification, sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { Lead } from "@/models/Lead";

/** Public enquiry form endpoint. */
export const POST = publicRoute(async (req) => {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`lead:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    throw new ApiError(429, "Too many submissions. Please try again in a few minutes.");
  }

  const { turnstileToken, website, ...data } = await parseJson(req, leadCreateSchema);

  // Honeypot filled in: pretend success so bots learn nothing, store nothing.
  if (website) return ok({ received: true }, { status: 201 });

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    throw new ApiError(400, "Verification failed. Please refresh the page and try again.");
  }

  const lead = await Lead.create(data);

  // Emails go out after the response so the visitor is never kept waiting.
  after(async () => {
    const notify = (env().LEAD_NOTIFY_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (notify.length) {
      await sendMail({ to: notify, replyTo: lead.email ?? undefined, ...buildLeadNotification(lead) });
    }
    if (lead.email) await sendMail({ to: lead.email, ...buildAutoReply(lead.name) });
  });

  return ok({ received: true, id: String(lead._id) }, { status: 201 });
});
