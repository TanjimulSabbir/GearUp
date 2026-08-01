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
  params: z.object({
    id: z.uuid("Invalid rental order id"),
  }),
});

// NOTE: this looks like it belongs in a review module, not rental.
// Review model only has gearItemId + userId + rating + comment — no rentalOrderId.
export const createReviewSchema = z.object({
  body: z
    .object({
      gearItemId: z.uuid("Invalid gear id"),
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().trim().max(1000).optional(),
    })
    .strict(),
});