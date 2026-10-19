"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* ---------------------------------- Toasts --------------------------------- */

type Toast = { id: number; kind: "success" | "error"; text: string };
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };

type Ctx = {
  success: (text: string) => void;
  error: (text: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProviders>");
  return ctx;
}

export function AdminProviders({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  /* ------------------------------- Confirm dialog ------------------------------ */
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (opts && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [opts]);

  const close = (value: boolean) => {
    dialogRef.current?.close();
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  const value: Ctx = {
    success: (t) => push("success", t),
    error: (t) => push("error", t),
    confirm,
  };

  return (
    <AdminCtx.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
              t.kind === "error" ? "bg-danger text-white" : "bg-ink text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-card p-0 text-text shadow-2xl"
      >
        {opts && (
          <div className="p-5">
            <h2 className="font-display text-lg font-semibold">{opts.title}</h2>
            {opts.message && <p className="mt-2 text-sm text-muted">{opts.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-paper"
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white ${
                  opts.danger ? "bg-danger hover:bg-danger/90" : "bg-brand hover:bg-brand-strong"
                }`}
              >
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </AdminCtx.Provider>
  );
}
