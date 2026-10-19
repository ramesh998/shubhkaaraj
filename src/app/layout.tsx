import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ShubhKaaraj | Wedding and Corporate Event Decor and Planning", template: "%s | ShubhKaaraj" },
  description: "ShubhKaaraj designs, decorates and plans weddings and corporate events. See our work and request a call back.",
  openGraph: { siteName: "ShubhKaaraj", type: "website", locale: "en_IN" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
