import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminProviders } from "@/components/admin/providers";

export const metadata: Metadata = {
  title: { default: "Admin | ShubhKaaraj", template: "%s | ShubhKaaraj admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
