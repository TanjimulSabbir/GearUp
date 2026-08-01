import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import httpStatus from "http-status";

// Valid provider-driven status transitions.
const ALLOWED_TRANSITIONS: Record<string, []> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  PAID: ["PICKED_UP"],
  PICKED_UP: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
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

    const activeOrders = await prisma.rentalOrderItem.count({
      where: {
        gearItemId: gearId,
        rentalOrder: {
          status: { in: ["PLACED", "CONFIRMED", "PAID", "PICKED_UP"] },
        },
      },
    });
    if (activeOrders > 0) {
      // Soft-delete instead of hard-delete so active rentals stay intact.
      return prisma.gearItem.update({
        where: { id: gearId },
        data: { isActive: false },
      });
    }

    await prisma.gearItem.delete({ where: { id: gearId } });
    return null;
  },

  // ---------- Orders ----------
  async getMyOrders(providerId: string) {
    return prisma.rentalOrder.findMany({
      where: { items: { some: { gearItem: { providerId } } } },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          where: { gearItem: { providerId } },
          include: {
            gearItem: { select: { id: true, name: true, images: true } },
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
      include: { items: true },
    });
    if (!order) throw AppError.notFound("Rental order not found");

    const ownsItem = order.items.some((item) => item.gearItemId); // ownership re-checked below
    const providerItems = await prisma.rentalOrderItem.findMany({
      where: { rentalOrderId: orderId, gearItem: { providerId } },
    });
    if (providerItems.length === 0) {
      throw AppError.forbidden("You do not have any gear in this order");
    }
    void ownsItem;

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw AppError.badRequest(
        `Cannot transition order from ${order.status} to ${nextStatus}`,
      );
    }

    // Restock gear when an order is cancelled or returned.
    if (nextStatus === "CANCELLED" || nextStatus === "RETURNED") {
      await prisma.$transaction(
        order.items.map((item) =>
          prisma.gearItem.update({
            where: { id: item.gearItemId },
            data: { availableStock: { increment: item.quantity } },
          }),
        ),
      );
    }

    return prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: { items: true, customer: { select: { id: true, name: true } } },
    });
  },
};
