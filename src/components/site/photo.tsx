import type { PublicImage } from "@/lib/public/types";

/**
 * Responsive photo. Uses the pre-generated AVIF/WebP widths, shows the blur
 * placeholder while loading, and a plum garland when no photo exists yet.
 */
export function Photo({
  image,
  sizes = "100vw",
  priority = false,
  className = "",
  fit = "cover",
}: {
  image?: PublicImage;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  if (!image) return <div aria-hidden className={`no-photo size-full ${className}`} />;
  const set = (k: "avif" | "webp") => image.variants.map((v) => `${v[k]} ${v.width}w`).join(", ");
  return (
    <picture>
      {image.variants.length > 0 && <source type="image/avif" srcSet={set("avif")} sizes={sizes} />}
      {image.variants.length > 0 && <source type="image/webp" srcSet={set("webp")} sizes={sizes} />}
      <img
        src={image.url}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        style={image.blur ? { backgroundImage: `url(${image.blur})`, backgroundSize: "cover" } : undefined}
        className={`size-full ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
      />
    </picture>
  );
}
