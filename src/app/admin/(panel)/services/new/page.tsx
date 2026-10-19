import type { Metadata } from "next";
import { ServiceForm } from "@/components/admin/services";

export const metadata: Metadata = { title: "Add service" };

export default function Page() {
  return <ServiceForm />;
}
