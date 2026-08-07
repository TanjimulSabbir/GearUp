import { z } from "zod";

export const createRentalSchema = z.object({
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      items: z
        .array(
          z.object({
            gearItemId: z.uuid("Invalid gear id"),
            quantity: z.number().int().positive(),
          }),
        )
        .min(1, "At least one item is required"),
    })
    .strict()
    .refine((data) => data.endDate > data.startDate, {
      message: "endDate must be after startDate",
      path: ["endDate"],
    }),
});

export const rentalIdParamSchema = z.object({
  params: z
    .object({
      id: z
        .string({
          error: "Rental order id is required",
        })
        .trim()
        .min(1, "Rental order id cannot be empty")
        .uuid("Invalid rental order id format"),
    })
    .strict(),
});

export const requestReturnSchema = z.object({
  params: z.object({
    id: z.uuid("Invalid rental order id"),
  }),
});