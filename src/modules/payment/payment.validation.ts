import { z } from "zod";

export const createPaymentSchema = z.object({
  body: z
    .object({
      rentalOrderId: z.string().uuid("Invalid rental order id"),
    })
    .strict(),
});

export const paymentIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid payment id") }),
});

export const confirmPaymentSchema = z
  .object({
    body: z
      .object({
        sessionId: z
          .string({ error: "sessionId is required" })
          .trim()
          .min(1, "sessionId cannot be empty")
          .startsWith("cs_", "Invalid Stripe session id"),
      })
      .strict()
      .optional(),
    query: z
      .object({
        session_id: z
          .string()
          .trim()
          .min(1)
          .startsWith("cs_", "Invalid Stripe session id")
          .optional(),
      })
      .optional(),
  })
  .refine((data) => data.body?.sessionId || data.query?.session_id, {
    message: "sessionId is required in body or session_id in query",
  });
