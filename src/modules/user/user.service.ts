import { prisma } from "../../lib/prisma";
import { UserRegisterSchemaType } from "./user.validation";

export const userService = {
  async createUser(payload: UserRegisterSchemaType) {
    const user = await prisma.user.create({ data: payload });
    return user;
  },
};
