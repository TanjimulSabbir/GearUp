import { z } from "zod";

export const updateUserStatusSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid user id") }),
  body: z
    .object({
      status: z.enum(["ACTIVE", "SUSPENDED"]),
    })
    .strict(),
});
