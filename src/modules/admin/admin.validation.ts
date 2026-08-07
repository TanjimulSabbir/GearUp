import { z } from "zod";
import { AccountStatus } from "../../../generated/prisma/enums";

export const updateUserStatusSchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid user id") }),
  body: z
    .object({
      accountStatus: z.enum(AccountStatus),
    })
    .strict(),
});
