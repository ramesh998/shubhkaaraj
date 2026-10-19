import type { Metadata } from "next";
import { LeadsInbox } from "@/components/admin/leads";

export const metadata: Metadata = { title: "Enquiries" };

export default function Page() {
  return <LeadsInbox />;
}
