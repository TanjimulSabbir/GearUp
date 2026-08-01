import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z
      .email("Please enter a valid email address")
      .transform((email) => email.toLowerCase()),

    password: z
      .string({ error: "Password is required" })
      .min(1, "Password cannot be empty"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token cannot be empty").optional(),
  }),
});
