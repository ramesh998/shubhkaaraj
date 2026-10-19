import type { ListMeta } from "./types";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Options = { method?: string; json?: unknown; form?: FormData };

/** Calls the JSON API. Redirects to the login page when the session has ended. */
export async function api<T>(path: string, opts: Options = {}): Promise<{ data: T; meta?: ListMeta }> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form;
  }

  let res: Response;
  try {
    res = await fetch(path, { method: opts.method ?? "GET", headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiClientError(0, "Could not reach the server. Check your connection and try again.");
  }

  let payload: { data?: T; meta?: ListMeta; error?: { message?: string; details?: unknown } } | null = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/admin/login?next=${next}`);
  }
  if (!res.ok) {
    throw new ApiClientError(res.status, payload?.error?.message ?? `Request failed (${res.status})`, payload?.error?.details);
  }
  return { data: payload?.data as T, meta: payload?.meta };
}

/** Field-level messages from a 400 validation response, keyed by field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiClientError)) return {};
  const fe = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  if (!fe) return {};
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]]));
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const fe = fieldErrors(err);
    const first = Object.entries(fe)[0];
    return first ? `${first[0]}: ${first[1]}` : err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

/** Upload images with progress. Returns the processed image documents. */
export function uploadImages(
  files: File[],
  folder: "events" | "services" | "testimonials",
  onProgress?: (fraction: number) => void,
): Promise<import("./types").MediaImage[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("folder", folder);
    for (const f of files) form.append("files", f);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiClientError(0, "Upload failed. Check your connection and try again."));
    xhr.onload = () => {
      let payload: { data?: import("./types").MediaImage[]; error?: { message?: string } } | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.data) resolve(payload.data);
      else reject(new ApiClientError(xhr.status, payload?.error?.message ?? `Upload failed (${xhr.status})`));
    };
    xhr.send(form);
  });
}
