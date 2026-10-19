/** "Royal Wedding – Udaipur!" -> "royal-wedding-udaipur" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/**
 * Returns `base`, or `base-2`, `base-3`, ... until `exists` says it is free.
 * `exists` is injected so the function stays testable without a database.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  for (let i = 2; await exists(candidate); i++) {
    candidate = `${root}-${i}`;
    if (i > 500) throw new Error("Could not generate a unique slug");
  }
  return candidate;
}
