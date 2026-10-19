import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShubhKaaraj | Wedding & Event Decor and Planning",
  description: "ShubhKaaraj designs and plans weddings and corporate events.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
