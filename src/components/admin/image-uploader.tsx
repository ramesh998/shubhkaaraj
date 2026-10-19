"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { api, errorMessage, uploadImages } from "./api";
import { useAdmin } from "./providers";
import { cx, Spinner } from "./ui";
import type { MediaImage } from "./types";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 15 * 1024 * 1024;
const BATCH = 5; // files per request (the API accepts up to 10)

/** Storage keys of every file belonging to an image (mirrors the server). */
function keysFor(img: MediaImage) {
  return (img.variants ?? []).flatMap((v) => [`${img.baseKey}/${v.width}.webp`, `${img.baseKey}/${v.width}.avif`]);
}

const withOrder = (list: MediaImage[]) => list.map((img, i) => ({ ...img, order: i }));

/** The smallest variant is plenty for a thumbnail. */
const thumb = (img: MediaImage) => img.variants?.[0]?.webp ?? img.url;

type Props = {
  value: MediaImage[];
  onChange: (images: MediaImage[]) => void;
  folder: "events" | "services" | "testimonials";
  /** Maximum number of images (1 turns this into a single-photo picker). */
  max?: number;
  /** Current cover; when `onCoverChange` is given, tiles get a "Set as cover" action. */
  cover?: MediaImage | null;
  onCoverChange?: (img: MediaImage | null) => void;
  label?: string;
};

export function ImageUploader({ value, onChange, folder, max = 60, cover, onCoverChange, label }: Props) {
  const { error: toastError, success } = useAdmin();
  const [progress, setProgress] = useState<{ done: number; total: number; fraction: number } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /** Images uploaded during this editing session; safe to delete if the user discards them. */
  const fresh = useRef(new Map<string, MediaImage>());
  // Keep the latest value reachable from async upload callbacks.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const coverKey = cover?.baseKey ?? value[0]?.baseKey;
  const room = max - value.length;

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list);
    const ok = files.filter((f) => ACCEPT.includes(f.type) && f.size <= MAX_BYTES);
    const skipped = files.length - ok.length;
    if (skipped) toastError(`${skipped} file${skipped === 1 ? " was" : "s were"} skipped. Use JPEG, PNG, WebP or AVIF images under 15 MB.`);
    if (!ok.length) return;
    const accepted = ok.slice(0, Math.max(0, room));
    if (accepted.length < ok.length) toastError(`You can add up to ${max} photo${max === 1 ? "" : "s"} here.`);
    if (!accepted.length) return;

    setProgress({ done: 0, total: accepted.length, fraction: 0 });
    try {
      let done = 0;
      for (let i = 0; i < accepted.length; i += BATCH) {
        const batch = accepted.slice(i, i + BATCH);
        const uploaded = await uploadImages(batch, folder, (f) =>
          setProgress({ done, total: accepted.length, fraction: (done + f * batch.length) / accepted.length }),
        );
        done += batch.length;
        for (const img of uploaded) fresh.current.set(img.baseKey, img);
        // Append as each batch lands so work is never lost if a later batch fails.
        const next = max === 1 ? uploaded.slice(0, 1) : [...latest.current, ...uploaded];
        latest.current = withOrder(next);
        onChange(latest.current);
        setProgress({ done, total: accepted.length, fraction: done / accepted.length });
      }
      success(`${accepted.length} photo${accepted.length === 1 ? "" : "s"} uploaded. Save to keep them.`);
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(index: number) {
    const img = value[index];
    const next = withOrder(value.filter((_, i) => i !== index));
    onChange(next);
    if (cover?.baseKey === img.baseKey) onCoverChange?.(next[0] ?? null);
    // Files that were never saved to a record are safe to delete right away.
    if (fresh.current.has(img.baseKey)) {
      fresh.current.delete(img.baseKey);
      api("/api/admin/media", { method: "DELETE", json: { keys: keysFor(img) } }).catch(() => undefined);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(withOrder(next));
  }

  function setAlt(index: number, alt: string) {
    onChange(value.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  /* ---- drag and drop (files from the desktop vs. tiles being reordered) ---- */
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="ml-auto text-sm text-muted">
          {value.length} of {max} photo{max === 1 ? "" : "s"}
        </span>
      </div>

      {value.length > 0 && (
        <ul className={cx("mb-3 grid gap-3", max === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 sm:grid-cols-3")}>
          {value.map((img, i) => {
            const isCover = onCoverChange && img.baseKey === coverKey;
            return (
              <li
                key={img.baseKey}
                draggable={value.length > 1}
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  if (dragIndex === null || hasFiles(e)) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  if (dragIndex === null || hasFiles(e)) return;
                  e.preventDefault();
                  move(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={cx(
                  "group relative overflow-hidden rounded-xl border bg-card transition-shadow",
                  dragIndex === i && "opacity-40",
                  overIndex === i && dragIndex !== i ? "border-brand ring-2 ring-brand/30" : "border-line",
                )}
              >
                <div className="relative aspect-[4/3] bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb(img)}
                    alt={img.alt || ""}
                    width={img.width}
                    height={img.height}
                    loading="lazy"
                    draggable={false}
                    className="size-full object-cover"
                    style={img.blurDataURL ? { backgroundImage: `url(${img.blurDataURL})`, backgroundSize: "cover" } : undefined}
                  />
                  {isCover && (
                    <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-xs font-semibold text-white">Cover</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-ink/75 text-white hover:bg-danger"
                  >
                    ×
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0}
                        aria-label={`Move photo ${i + 1} earlier`}
                        className="grid size-7 place-items-center rounded-md bg-white/90 text-sm text-ink disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, i + 1)}
                        disabled={i === value.length - 1}
                        aria-label={`Move photo ${i + 1} later`}
                        className="grid size-7 place-items-center rounded-md bg-white/90 text-sm text-ink disabled:opacity-40"
                      >
                        →
                      </button>
                    </span>
                    {onCoverChange && !isCover && (
                      <button
                        type="button"
                        onClick={() => onCoverChange(img)}
                        className="whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-ink hover:bg-white"
                      >
                        Make cover
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={img.alt}
                  onChange={(e) => setAlt(i, e.target.value)}
                  maxLength={200}
                  placeholder="Describe this photo"
                  aria-label={`Description of photo ${i + 1}`}
                  className="w-full border-t border-line bg-card px-2.5 py-2 text-xs text-text placeholder:text-muted/70 focus-visible:outline-offset-[-2px]"
                />
              </li>
            );
          })}
        </ul>
      )}

      {room > 0 && (
        <label
          onDragOver={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setDropActive(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cx(
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:border-brand",
            dropActive ? "border-brand bg-brand-soft" : "border-line bg-card hover:border-brand/50 hover:bg-paper",
            progress && "pointer-events-none opacity-80",
          )}
        >
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT.join(",")}
            multiple={max > 1}
            className="sr-only"
            onChange={(e) => e.target.files && void handleFiles(e.target.files)}
          />
          {progress ? (
            <>
              <Spinner className="size-6 text-brand" />
              <p className="mt-1 text-sm font-medium text-text">
                Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}
              </p>
              <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-brand transition-[width]" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-text">{max === 1 ? "Choose a photo" : "Drop photos here, or tap to choose"}</p>
              <p className="text-sm text-muted">JPEG, PNG, WebP or AVIF, up to 15 MB each. Drag photos to reorder them.</p>
            </>
          )}
        </label>
      )}
    </div>
  );
}
