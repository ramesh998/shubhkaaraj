import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { LoadingBlock } from "@/components/admin/ui";

export default function PanelLayout({ children }: { children: ReactNode }) {
  // The shell reads the current URL (to highlight the menu), which must sit inside Suspense.
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <LoadingBlock />
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
