import { z } from "zod";

export const userRegisterSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, "Name cannot be empty")
      .max(100, "Name must be at most 100 characters"),

    email: z
      .email("Please enter a valid email address")
      .transform((email) => email.toLowerCase()),

    password: z
      .string({ error: "Password is required" })
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be at most 128 characters"),

    phone: z.string().trim().optional(),

    address: z
      .string()
      .trim()
      .max(255, "Address must be at most 255 characters")
      .optional(),

    role: z
      .enum(["CUSTOMER", "PROVIDER"], {
        error: "Role must be either CUSTOMER or PROVIDER",
      })
  }),
});

export type UserRegisterSchemaType = z.infer<
  typeof userRegisterSchema
>["body"];