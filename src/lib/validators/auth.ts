import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .refine((v) => /[a-z]/i.test(v) && /\d/.test(v), "Include letters and numbers");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(128),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: passwordSchema,
  role: z.enum(USER_ROLES).default("editor"),
});

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    password: passwordSchema,
    role: z.enum(USER_ROLES),
    active: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
