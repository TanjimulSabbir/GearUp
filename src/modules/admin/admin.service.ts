import { AccountStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import httpStatus from "http-status";

export const adminService = {
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateUserStatus(userId: string, accountStatus: AccountStatus) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Your account has been not found. Please contact support.",
      );

    if (user.role === "ADMIN") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You cannot block or unblock an admin account.",
      );
    }

    return await prisma.user.update({
      where: { id: userId },
      data: { accountStatus, isActive: accountStatus === "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });
  },

  async getAllGear() {
    return prisma.gearItem.findMany({
      include: {
        category: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getAllRentals() {
    return prisma.rentalOrder.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: { include: { gearItem: { select: { id: true, name: true } } } },
        payments: {
          select: { id: true, status: true, amount: true, method: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
