import { z } from "zod";

export const registerSchema = z.object({
  email: z.string({ message: "email is required" }).email("must be a valid email"),
  password: z
    .string({ message: "password is required" })
    .min(8, "password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string({ message: "email is required" }).email("must be a valid email"),
  password: z.string({ message: "password is required" }),
});
