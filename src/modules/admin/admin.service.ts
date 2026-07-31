import { UserStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";

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

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");
    if (user.role === "ADMIN") {
      throw AppError.forbidden("Cannot change the status of an admin account");
    }

    return prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true },
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
        payments: { select: { id: true, status: true, amount: true, method: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
