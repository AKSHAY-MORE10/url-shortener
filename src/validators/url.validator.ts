import { z } from "zod";

export const createUrlSchema = z.object({
  originalUrl: z
    .string({ message: "originalUrl is required" })
    .url({ message: "originalUrl must be a valid URL" }),
  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO date string" })
    .optional(),
});