import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(100, "Name must be at most 100 characters"),

  email: z.email("Please enter a valid email address"),

  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),

  password: z
    .string({ error: "Password is required" })
    .min(1, "Password cannot be empty"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken cannot be empty").optional(),
});
