/**
 * Creates (or resets) the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Usage: npm run seed:admin
 */
import mongoose from "mongoose";
import { User } from "../src/models/User";
import { hashPassword } from "../src/lib/password";
import { passwordSchema } from "../src/lib/validators/auth";

async function main() {
  const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in your environment (.env)");
  }
  const pw = passwordSchema.safeParse(ADMIN_PASSWORD);
  if (!pw.success) throw new Error(pw.error.issues[0].message);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = "admin";
    existing.active = true;
    existing.tokenVersion += 1;
    await existing.save();
    console.log(`Updated existing admin: ${email}`);
  } else {
    await User.create({ name: ADMIN_NAME || "Admin", email, passwordHash, role: "admin" });
    console.log(`Created admin: ${email}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
