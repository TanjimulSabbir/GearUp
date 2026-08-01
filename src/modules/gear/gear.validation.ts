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

    image: z.url("Image must be a valid URL").optional(),

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

export const getAllGearSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().optional().default(1),
      limit: z.coerce.number().int().positive().max(100).optional().default(10),
      sortBy: z
        .enum(["name", "rentalPrice", "createdAt", "stock"])
        .optional()
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      search: z.string().trim().min(1).optional(),
      categoryId: z.uuid("Invalid category id").optional(),
      brand: z.string().trim().min(1).optional(),
      condition: z.enum(GearCondition).optional(),
      minPrice: z.coerce.number().nonnegative().optional(),
      maxPrice: z.coerce.number().nonnegative().optional(),
      isAvailable: z.enum(["true", "false"]).optional(),
    })
    .refine(
      (data) =>
        data.minPrice === undefined ||
        data.maxPrice === undefined ||
        data.minPrice <= data.maxPrice,
      {
        message: "minPrice cannot be greater than maxPrice",
        path: ["minPrice"],
      },
    ),
});

export const getGearByIdSchema = z.object({
  params: z.object({
    id: z.uuid("Invalid gear id"),
  }),
});

export type CreateGearItemSchemaType = z.infer<
  typeof createGearItemSchema
>["body"];

export type TGetAllGearQuery = z.infer<typeof getAllGearSchema>["query"];

export type TGetGearByIdParams = z.infer<typeof getGearByIdSchema>["params"];
