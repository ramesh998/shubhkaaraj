import { Suspense } from "react";
import { getSettings } from "@/lib/public/data";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/site/chrome";

async function Header() {
  return <SiteHeader settings={await getSettings()} />;
}
async function Footer() {
  const s = await getSettings();
  return (
    <>
      <SiteFooter settings={s} />
      <WhatsAppFab whatsapp={s.whatsapp} />
    </>
  );
}

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Suspense fallback={<div className="h-[61px] border-b border-line" />}>
        <Header />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<div className="mt-24 h-64 bg-ink" />}>
        <Footer />
      </Suspense>
    </>
  );
}
