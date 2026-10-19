import { Suspense } from "react";
import type { Metadata } from "next";
import { ServiceEditor } from "@/components/admin/services";
import { LoadingBlock } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit service" };

export default function Page({ params }: PageProps<"/admin/services/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ServiceEditor params={params} />
    </Suspense>
  );
}
