"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "./api";
import { useApi } from "./use-api";
import { cx, ErrorBlock, LoadingBlock } from "./ui";
import type { LeadRecord, Role } from "./types";

type Me = { id: string; name: string; email: string; role: Role };
const MeCtx = createContext<Me | null>(null);

export function useMe(): Me {
  const me = useContext(MeCtx);
  if (!me) throw new Error("useMe must be used inside <AdminShell>");
  return me;
}

/* ---------------------------------- Icons ---------------------------------- */

const icons = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h14V10",
  calendar: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  inbox: "M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6l2-8Z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z",
  quote: "M7 7h4v5a4 4 0 0 1-4 4M15 7h4v5a4 4 0 0 1-4 4",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  people: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m13-9a3 3 0 1 0 0-6m5 15v-1a4 4 0 0 0-3-3.9M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  external: "M14 4h6v6m0-6-9 9M10 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5",
};

export function Icon({ name, className = "size-5" }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

/* ----------------------------------- Shell --------------------------------- */

const NAV: { href: string; label: string; icon: keyof typeof icons; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "home" },
  { href: "/admin/leads", label: "Enquiries", icon: "inbox" },
  { href: "/admin/events", label: "Events", icon: "calendar" },
  { href: "/admin/services", label: "Services", icon: "sparkle" },
  { href: "/admin/testimonials", label: "Testimonials", icon: "quote" },
  { href: "/admin/settings", label: "Site settings", icon: "gear" },
  { href: "/admin/users", label: "Team", icon: "people", adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({ children }: { children: ReactNode }) {
  const me = useApi<Me>("/api/auth/me");
  const pathname = usePathname();
  // The drawer is open only on the page it was opened from, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const [signingOut, setSigningOut] = useState(false);
  const newLeads = useApi<LeadRecord[]>(me.data ? "/api/admin/leads?status=new&limit=1" : null);

  if (me.loading || me.error || !me.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-6">
        {me.error ? <ErrorBlock message={me.error} onRetry={me.reload} /> : <LoadingBlock />}
      </div>
    );
  }
  const user = me.data;
  const newCount = newLeads.meta?.total ?? 0;

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      // Full page load on purpose: drops all client state after signing out.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/admin/login");
    }
  }

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-0.5 px-3 py-4">
      {NAV.filter((n) => !n.adminOnly || user.role === "admin").map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon name={n.icon} className="size-5 shrink-0" />
            <span className="flex-1">{n.label}</span>
            {n.href === "/admin/leads" && newCount > 0 && (
              <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold" aria-label={`${newCount} new enquiries`}>
                {newCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="block px-6 pt-6">
      <span className="font-display text-2xl font-semibold tracking-tight text-white">ShubhKaaraj</span>
      <span className="mt-0.5 block text-sm text-white/55">Studio admin</span>
    </Link>
  );

  const footer = (
    <div className="border-t border-white/10 p-4">
      <a href="/" target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 px-2 text-sm text-white/70 hover:text-white">
        <Icon name="external" className="size-4" /> View website
      </a>
      <div className="flex items-center gap-3 rounded-lg bg-white/6 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-white/55">{user.role === "admin" ? "Admin" : "Editor"}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="rounded-md px-2 py-1 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-60"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <MeCtx.Provider value={user}>
      <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col bg-ink lg:flex">
          {brand}
          {nav}
          {footer}
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
          <Link href="/admin" className="font-display text-xl font-semibold text-white">
            ShubhKaaraj
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="relative rounded-lg p-2 text-white hover:bg-white/10"
          >
            <Icon name="menu" />
            {newCount > 0 && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-gold-soft" />}
          </button>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10"
              >
                <Icon name="close" />
              </button>
              {brand}
              {nav}
              {footer}
            </div>
          </div>
        )}

        <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </MeCtx.Provider>
  );
}
