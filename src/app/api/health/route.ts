import { connectDB } from "@/lib/db";

/** Liveness + database check, used by uptime monitors. */
export async function GET() {
  try {
    const m = await connectDB();
    await m.connection.db?.admin().ping();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
