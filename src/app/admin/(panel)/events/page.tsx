import { Suspense } from "react";
import type { Metadata } from "next";
import { EventsList } from "@/components/admin/events-list";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Events" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <EventsList />
    </Suspense>
  );
}
