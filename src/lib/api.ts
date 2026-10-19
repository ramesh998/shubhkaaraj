import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError, type ZodType } from "zod";
import { Error as MongooseError } from "mongoose";
import { connectDB } from "./db";
import { SESSION_COOKIE, type UserRole } from "./constants";
import { verifySession } from "./session";
import { User } from "@/models/User";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function okList<T>(data: T[], meta: { page: number; limit: number; total: number }) {
  return NextResponse.json({ data, meta });
}

function errorResponse(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

/** Converts anything thrown inside a handler into a consistent JSON error. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) return errorResponse(err.status, err.message, err.details);
  if (err instanceof ZodError) {
    return errorResponse(400, "Validation failed", err.flatten());
  }
  if (err instanceof MongooseError.ValidationError) {
    return errorResponse(400, "Validation failed", err.message);
  }
  if (err instanceof MongooseError.CastError) {
    return errorResponse(400, `Invalid value for ${err.path}`);
  }
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    return errorResponse(409, "A record with that unique value already exists");
  }
  // Let Next.js handle its own control-flow errors (prerender bail-outs, redirects, ...).
  unstable_rethrow(err);
  console.error("[api] unhandled error:", err);
  return errorResponse(500, "Something went wrong. Please try again.");
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  return schema.parse(body);
}

/* ------------------------------ Authentication ----------------------------- */

export type AuthedUser = { id: string; role: UserRole; name: string; email: string };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Blocks cross-site form posts that would ride on the session cookie. */
function assertSameOrigin(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      /* fall through */
    }
    if (!host || originHost !== host) throw new ApiError(403, "Cross-site request blocked");
  } else if (req.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "Cross-site request blocked");
  }
}

/**
 * Verifies the session cookie AND re-checks the user in the database, so
 * disabling a user or bumping tokenVersion takes effect immediately.
 */
export async function requireUser(
  req: NextRequest,
  roles: readonly UserRole[] = ["admin", "editor"],
): Promise<AuthedUser> {
  assertSameOrigin(req);
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new ApiError(401, "Please sign in");

  await connectDB();
  const user = await User.findById(session.sub).lean();
  if (!user || !user.active || user.tokenVersion !== session.tv) {
    throw new ApiError(401, "Please sign in again");
  }
  if (!roles.includes(user.role)) throw new ApiError(403, "You do not have access to this");
  return { id: String(user._id), role: user.role, name: user.name, email: user.email };
}

/* --------------------------------- Wrappers -------------------------------- */

type Ctx<P> = { params: Promise<P> };

/** Public route: error handling + DB connection. */
export function publicRoute<P = Record<string, never>>(
  fn: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      await connectDB();
      return await fn(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Authenticated route: error handling + auth (+ optional role restriction). */
export function adminRoute<P = Record<string, never>>(
  fn: (req: NextRequest, ctx: Ctx<P>, user: AuthedUser) => Promise<Response>,
  roles: readonly UserRole[] = ["admin", "editor"],
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const user = await requireUser(req, roles);
      return await fn(req, ctx, user);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
