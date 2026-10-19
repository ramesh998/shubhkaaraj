import { Resend } from "resend";
import { env } from "./env";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Mail = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };

/**
 * Sends through Resend when RESEND_API_KEY is set, otherwise prints to the console
 * so local development works without any account. Never throws: a mail failure
 * must not lose a lead.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const { RESEND_API_KEY, MAIL_FROM } = env();
  const recipients = Array.isArray(mail.to) ? mail.to : [mail.to];
  if (recipients.length === 0) return;

  if (!RESEND_API_KEY) {
    console.log(`[mail:dev] to=${recipients.join(",")} subject="${mail.subject}"\n${mail.text}\n`);
    return;
  }
  try {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from: MAIL_FROM,
      to: recipients,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
    });
    if (error) console.error("[mail] Resend rejected the message:", error);
  } catch (err) {
    console.error("[mail] send failed:", err);
  }
}

type LeadForMail = {
  name: string;
  phone: string;
  email?: string | null;
  eventType: string;
  eventDate?: Date | null;
  city?: string | null;
  budget?: string | null;
  guestCount?: number | null;
  message?: string | null;
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null } | null;
};

export function buildLeadNotification(lead: LeadForMail) {
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email ?? "-"],
    ["Event type", lead.eventType],
    ["Event date", lead.eventDate ? lead.eventDate.toDateString() : "-"],
    ["City", lead.city ?? "-"],
    ["Budget", lead.budget ?? "-"],
    ["Guests", lead.guestCount != null ? String(lead.guestCount) : "-"],
    ["Source", [lead.utm?.source, lead.utm?.medium, lead.utm?.campaign].filter(Boolean).join(" / ") || "direct"],
    ["Message", lead.message ?? "-"],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html =
    `<h2>New enquiry</h2><table cellpadding="6">` +
    rows.map(([k, v]) => `<tr><td><b>${escapeHtml(k)}</b></td><td>${escapeHtml(v)}</td></tr>`).join("") +
    `</table>`;
  return { subject: `New enquiry: ${lead.name} (${lead.eventType})`, html, text };
}

export function buildAutoReply(name: string) {
  const first = name.split(" ")[0];
  return {
    subject: "Thank you for contacting ShubhKaaraj",
    text: `Hi ${first},\n\nThank you for reaching out to ShubhKaaraj. We have received your enquiry and will call you within 24 hours.\n\nWarm regards,\nTeam ShubhKaaraj`,
    html: `<p>Hi ${escapeHtml(first)},</p><p>Thank you for reaching out to ShubhKaaraj. We have received your enquiry and will call you within 24 hours.</p><p>Warm regards,<br/>Team ShubhKaaraj</p>`,
  };
}
