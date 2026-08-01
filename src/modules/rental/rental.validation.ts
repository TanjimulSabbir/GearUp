import { z } from "zod";

export const createReviewSchema = z.object({
  body: z
    .object({
      gearItemId: z.string().uuid("Invalid gear id"),
      rentalOrderId: z.string().uuid("Invalid rental order id"),
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().trim().max(1000).optional(),
    })
    .strict(),
});
