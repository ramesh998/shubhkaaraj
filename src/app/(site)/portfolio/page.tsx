import { Suspense } from "react";
import type { Metadata } from "next";
import { getEvents } from "@/lib/public/data";
import { PortfolioGrid } from "@/components/site/portfolio-grid";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Wedding and corporate events decorated and planned by ShubhKaaraj.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-10 sm:px-6 md:pt-14">
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Our work</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">Real events we have decorated and planned. Open any one to see more photos and the story behind it.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-96" />}>
          <Grid />
        </Suspense>
      </div>
    </div>
  );
}

async function Grid() {
  const events = await getEvents({ limit: 60 });
  if (!events.length) return <p className="text-lg text-muted">We are adding our events here. Please check back soon, or get in touch to see more of our work.</p>;
  return <PortfolioGrid events={events} />;
}
