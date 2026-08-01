import { z } from "zod";
import { GearCondition } from "../../../generated/prisma/client";

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

export type TGetAllGearQuery = z.infer<typeof getAllGearSchema>["query"];

export type TGetGearByIdParams = z.infer<typeof getGearByIdSchema>["params"];
