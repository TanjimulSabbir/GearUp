import { z } from "zod";
import { GearCondition } from "../../../generated/prisma/client";

export const createGearItemSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, "Name cannot be empty")
      .max(200, "Name must be at most 200 characters"),

    description: z
      .string({ error: "Description is required" })
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(5000, "Description must be at most 5000 characters"),

    brand: z
      .string({ error: "Brand is required" })
      .trim()
      .min(1, "Brand cannot be empty")
      .max(100, "Brand must be at most 100 characters"),

    image: z
      .url("Image must be a valid URL")
      .optional(),

    rentalPrice: z
      .number({
        error: "Rental price is required and must be a number",
      })
      .positive("Rental price must be greater than 0"),

    stock: z
      .number({
        error: "Stock is required and must be a number",
      })
      .int("Stock must be an integer")
      .nonnegative("Stock cannot be negative"),

    condition: z
      .enum(GearCondition, {
        error: "Condition must be NEW, GOOD, FAIR, or POOR",
      })
      .default("GOOD"),

    categoryId: z
      .string({ error: "Category ID is required" })
      .uuid("Invalid category ID"),
  }),
});

export type CreateGearItemSchemaType = z.infer<
  typeof createGearItemSchema
>["body"];