import { NextResponse } from "next/server";
import { ApiError, parseJson, publicRoute } from "@/lib/api";
import { loginSchema } from "@/lib/validators/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { signSession } from "@/lib/session";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { User } from "@/models/User";

const WINDOW_MS = 15 * 60 * 1000;

export const POST = publicRoute(async (req) => {
  const ip = clientIp(req.headers);
  const byIp = rateLimit(`login:ip:${ip}`, 20, WINDOW_MS);
  if (!byIp.ok) throw new ApiError(429, "Too many attempts. Try again later.");

  const { email, password } = await parseJson(req, loginSchema);
  const byEmail = rateLimit(`login:email:${email}`, 5, WINDOW_MS);
  if (!byEmail.ok) throw new ApiError(429, "Too many attempts. Try again later.");

  const user = await User.findOne({ email }).select("+passwordHash");
  // Always run a bcrypt comparison so response time does not reveal whether the email exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !valid) throw new ApiError(401, "Incorrect email or password");

  user.lastLoginAt = new Date();
  await user.save();

  const token = await signSession({ sub: String(user._id), role: user.role, tv: user.tokenVersion });
  const res = NextResponse.json({
    data: { id: String(user._id), name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
});
