import { SignJWT, jwtVerify } from "jose";
import { SESSION_MAX_AGE_SECONDS, type UserRole } from "./constants";

export type SessionPayload = {
  sub: string; // user id
  role: UserRole;
  tv: number; // user.tokenVersion at issue time
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, tv: payload.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the payload for a valid, unexpired token, otherwise null. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.tv !== "number") return null;
    if (payload.role !== "admin" && payload.role !== "editor") return null;
    return { sub: payload.sub, role: payload.role, tv: payload.tv };
  } catch {
    return null;
  }
}
