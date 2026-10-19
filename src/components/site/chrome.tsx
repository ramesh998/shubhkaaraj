import Link from "next/link";
import type { PublicSettings } from "@/lib/public/types";
import { telHref, whatsappHref } from "@/lib/site";

const NAV = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ settings }: { settings: PublicSettings }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold text-ink sm:text-2xl">
          {settings.businessName}
        </Link>
        <nav aria-label="Main" className="flex items-center sm:gap-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-2.5 py-2 text-[0.9rem] font-medium text-ink hover:bg-brand-soft sm:px-3 sm:text-[0.95rem]">
              {n.label}
            </Link>
          ))}
          <Link href="/contact" className="ml-1 hidden rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-strong sm:block">
            Plan my event
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: PublicSettings }) {
  const social = Object.entries(settings.social).filter(([, v]) => v) as [string, string][];
  return (
    <footer className="mt-24 bg-ink text-white/85">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-semibold text-white">{settings.businessName}</p>
          <p className="mt-3 max-w-sm">{settings.tagline ?? "Wedding and corporate event decor and planning."}</p>
        </div>
        <div>
          <p className="font-semibold text-white">Explore</p>
          <ul className="mt-3 space-y-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-haldi">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Talk to us</p>
          <ul className="mt-3 space-y-2">
            {settings.phone && (
              <li>
                <a href={telHref(settings.phone)} className="hover:text-haldi">{settings.phone}</a>
              </li>
            )}
            {settings.whatsapp && (
              <li>
                <a href={whatsappHref(settings.whatsapp)} className="hover:text-haldi">WhatsApp</a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-haldi">{settings.email}</a>
              </li>
            )}
            {settings.address && <li className="max-w-xs">{settings.address}</li>}
            {social.map(([k, url]) => (
              <li key={k}>
                <a href={url} rel="noopener noreferrer" target="_blank" className="capitalize hover:text-haldi">{k}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-5 text-center text-sm text-white/60">
        © {new Date().getFullYear()} {settings.businessName}
      </p>
    </footer>
  );
}

/** Always-visible WhatsApp shortcut on phones, where most enquiries start. */
export function WhatsAppFab({ whatsapp }: { whatsapp?: string }) {
  if (!whatsapp) return null;
  return (
    <a
      href={whatsappHref(whatsapp)}
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-4 right-4 z-30 grid size-14 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-lg hover:bg-[#186139] md:hidden"
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.200Zm4.5-6.100c-.2-.1-1.500-.7-1.700-.8-.2-.1-.4-.1-.6.100l-.8 1c-.1.200-.3.200-.5.100a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.200-.4.700-1.300.1-.1 0-.3 0-.4l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.300 3 3 0 0 0-.9 2.200c0 1.300.9 2.500 1 2.700.1.200 1.800 2.800 4.400 3.900 1.600.7 2.200.7 3 .6.500-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.2-1.200-.1-.1-.3-.2-.5-.3Z" />
      </svg>
    </a>
  );
}
