import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** A real bcrypt hash of a random string, used to keep login timing uniform for unknown emails. */
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-" + Math.random(), ROUNDS);
