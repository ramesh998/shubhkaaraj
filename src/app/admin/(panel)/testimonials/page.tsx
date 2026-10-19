import type { Metadata } from "next";
import { TestimonialsManager } from "@/components/admin/testimonials";

export const metadata: Metadata = { title: "Testimonials" };

export default function Page() {
  return <TestimonialsManager />;
}
