"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";
import type { ListMeta } from "./types";

type State<T> = { key: string; data?: T; meta?: ListMeta; error?: string };

/**
 * Loads `path` and reloads when it changes. `loading` is derived (the stored result
 * belongs to a different path/version) so no state is set synchronously inside the effect.
 */
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ key: "" });
  const key = path ? `${path}#${version}` : "";

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((r) => !cancelled && setState({ key, data: r.data, meta: r.meta }))
      .catch((e) => !cancelled && setState({ key, error: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    meta: current ? state.meta : undefined,
    error: current ? state.error : undefined,
    loading: !!path && !current,
    reload,
  };
}
