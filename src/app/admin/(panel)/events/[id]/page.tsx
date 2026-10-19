import { Suspense } from "react";
import type { Metadata } from "next";
import { EventEditor } from "@/components/admin/event-form";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit event" };

export default function Page({ params }: PageProps<"/admin/events/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <EventEditor params={params} />
    </Suspense>
  );
}
