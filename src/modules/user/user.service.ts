import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import { UserRegisterSchemaType } from "./user.validation";
import httpStatus from "http-status";
import config from "../../config";

export const userService = {
  async createUser(payload: UserRegisterSchemaType) {
    const { email, password } = payload;
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "User already exists with this email",
        { email },
      );
    }
    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    const user = await prisma.user.create({
      data: { ...payload, password: hashedPassword },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },
};
