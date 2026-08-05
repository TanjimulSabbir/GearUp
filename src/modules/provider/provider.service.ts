import { Prisma } from "../../../generated/prisma/client";
import { RentalStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import httpStatus from "http-status";


const ALLOWED_TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  PAID: ["PICKED_UP"],
  PICKED_UP: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
  PAYMENT_FAILED: [],
};

export const providerServices = {
  async createGearItem(
    providerId: string,
    payload: Prisma.GearItemUncheckedCreateInput,
  ) {
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId },
    });
    if (!category) {
      throw new AppError(httpStatus.BAD_REQUEST, "Category not found.");
    }

    return prisma.gearItem.create({
      data: { ...payload, providerId },
    });
  },

  async getMyGear(providerId: string) {
    return prisma.gearItem.findMany({
      where: { providerId },
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateGear(
    providerId: string,
    gearId: string,
    data: Prisma.GearItemUncheckedUpdateManyInput,
  ) {
    const gear = await prisma.gearItem.findUnique({ where: { id: gearId } });
    if (!gear) {
      throw new AppError(httpStatus.NOT_FOUND, "Gear item not found.");
    }

    if (gear.providerId !== providerId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not own this gear item.",
      );
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId as string },
      });

      if (!category) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid category.");
      }
    }

    return prisma.gearItem.update({
      where: { id: gearId },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        provider: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async removeGear(providerId: string, gearId: string) {
    const gear = await prisma.gearItem.findUnique({ where: { id: gearId } });
    if (!gear)
      throw new AppError(httpStatus.BAD_REQUEST, "Gear item not found");
    if (gear.providerId !== providerId) {
      throw new AppError(httpStatus.FORBIDDEN, "You do not own this gear item");
    }

    const activeOrders = await prisma.rentalItem.count({
      where: {
        gearItemId: gearId,
        rentalOrder: {
          status: { in: ["PLACED", "CONFIRMED", "PAID", "PICKED_UP"] },
        },
      },
    });
    if (activeOrders > 0) {
      return prisma.gearItem.update({
        where: { id: gearId },
        data: { isAvailable: false },
      });
    }

    await prisma.gearItem.delete({ where: { id: gearId } });
    return null;
  },

  async getMyOrders(providerId: string) {
    return prisma.rentalOrder.findMany({
      where: { rentalItems: { some: { gearItem: { providerId } } } },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        rentalItems: {
          where: { gearItem: { providerId } },
          include: {
            gearItem: { select: { id: true, name: true, image: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateOrderStatus(
    providerId: string,
    orderId: string,
    nextStatus: RentalStatus,
  ) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { rentalItems: true },
    });
    if (!order) throw new AppError(httpStatus.NOT_FOUND, "Order not found");

    const providerItems = await prisma.rentalItem.findMany({
      where: { rentalOrderId: orderId, gearItem: { providerId } },
    });
    if (providerItems.length === 0) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have any gear in this order",
      );
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot transition order from ${order.status} to ${nextStatus}.`,
      );
    }

    if (nextStatus === "CANCELLED" || nextStatus === "RETURNED") {
      await prisma.$transaction(
        order.rentalItems.map((item) =>
          prisma.gearItem.update({
            where: { id: item.gearItemId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );
    }

    return prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: {
        rentalItems: true,
        customer: { select: { id: true, name: true } },
      },
    });
  },
};