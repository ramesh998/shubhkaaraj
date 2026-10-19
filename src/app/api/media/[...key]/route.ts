import { NextResponse } from "next/server";
import { readLocalObject, storageMode } from "@/lib/storage";

/**
 * Serves images from the local upload folder (development / no-R2 setups).
 * With R2 configured, images are served from the bucket's own domain instead.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (storageMode() !== "local") return new NextResponse("Not found", { status: 404 });
  const { key } = await ctx.params;
  const file = await readLocalObject(key.join("/"));
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
