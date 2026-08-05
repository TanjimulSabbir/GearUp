import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";


interface CreateRentalInput {
  startDate: Date;
  endDate: Date;
  items: { gearItemId: string; quantity: number }[];
}

interface RentalItemCreateData {
  gearItemId: string;
  quantity: number;
  pricePerDay: number;
  days: number;
}

function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export const rentalService = {
  async create(customerId: string, input: CreateRentalInput) {
    const days = daysBetween(input.startDate, input.endDate);
    const gearIds = input.items.map((i) => i.gearItemId);

    return prisma.$transaction(async (tx) => {
      // Fixed: was one findFirst() per item (N queries). Now a single
      // findMany() for all items in the cart.
      const gearItems = await tx.gearItem.findMany({
        where: { id: { in: gearIds }, isAvailable: true },
      });
      const gearById = new Map(gearItems.map((g) => [g.id, g]));

      let totalAmount = 0;
      const rentalItemsData: RentalItemCreateData[] = [];

      for (const item of input.items) {
        const gear = gearById.get(item.gearItemId);
        if (!gear) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            `Gear item ${item.gearItemId} not found or unavailable.`,
          );
        }

        totalAmount += gear.rentalPrice * item.quantity * days;

        rentalItemsData.push({
          gearItemId: gear.id,
          quantity: item.quantity,
          pricePerDay: gear.rentalPrice, // snapshot, protects against future price changes
          days,
        });

        // Fixed: was a separate findFirst-then-update, which left a race
        // window where two concurrent orders could both pass the stock
        // check for the last unit. This makes the check and the decrement
        // one atomic operation — if another transaction already took the
        // stock, this updates 0 rows instead of going negative.
        const result = await tx.gearItem.updateMany({
          where: { id: gear.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          throw new AppError(
            httpStatus.CONFLICT,
            `Insufficient stock for "${gear.name}". Someone else may have just booked it — please try again.`,
          );
        }
      }

      return tx.rentalOrder.create({
        data: {
          customerId,
          startDate: input.startDate,
          endDate: input.endDate,
          totalAmount,
          status: "PLACED",
          rentalItems: { create: rentalItemsData },
        },
        include: {
          rentalItems: {
            include: { gearItem: { select: { id: true, name: true, image: true } } },
          },
        },
      });
    });
  },

  async releaseStock(orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { rentalItems: true },
    });
    if (!order) return null;
    if (!["PLACED", "CONFIRMED"].includes(order.status)) return order;

    return prisma.$transaction(async (tx) => {
      await Promise.all(
        order.rentalItems.map((item) =>
          tx.gearItem.update({
            where: { id: item.gearItemId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );

      return tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: "PAYMENT_FAILED" },
      });
    });
  },

  async getMine(customerId: string) {
    return prisma.rentalOrder.findMany({
      where: { customerId },
      include: {
        rentalItems: {
          include: { gearItem: { select: { id: true, name: true, image: true } } },
        },
        payments: {
          select: { id: true, status: true, amount: true, method: true, paidAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(requesterId: string, role: string, orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: {
        rentalItems: { include: { gearItem: true } },
        payments: true,
        customer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, "Rental order not found.");
    }

    const isOwner = order.customerId === requesterId;
    const isAdmin = role === "ADMIN";
    const isProviderOfItem = order.rentalItems.some(
      (item) => item.gearItem.providerId === requesterId,
    );

    if (!isOwner && !isAdmin && !isProviderOfItem) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have access to this rental order.",
      );
    }

    return order;
  },

  async cancel(customerId: string, orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { rentalItems: true },
    });
    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, "Rental order not found.");
    }
    if (order.customerId !== customerId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only cancel your own orders.",
      );
    }
    if (!["PLACED", "CONFIRMED"].includes(order.status)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order in status ${order.status} cannot be cancelled.`,
      );
    }

    return prisma.$transaction(async (tx) => {
      await Promise.all(
        order.rentalItems.map((item) =>
          tx.gearItem.update({
            where: { id: item.gearItemId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );

      return tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });
    });
  },
};