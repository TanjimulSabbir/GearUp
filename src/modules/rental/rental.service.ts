import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import { expireStaleReservations } from "./rental.utils";

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

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const rentalItemsData: RentalItemCreateData[] = [];

      for (const item of input.items) {
        let gear = await tx.gearItem.findFirst({
          where: { id: item.gearItemId, isAvailable: true },
        });
        if (!gear) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            `Gear item ${item.gearItemId} not found or unavailable.`,
          );
        }

        // On-demand fallback: not enough stock? try freeing stale reservations
        // for this specific gear item before giving up.
        if (gear.stock < item.quantity) {
          await expireStaleReservations(tx, item.gearItemId);
          gear = await tx.gearItem.findUnique({ where: { id: item.gearItemId } });
        }

        if (!gear || gear.stock < item.quantity) {
          throw new AppError(
            httpStatus.CONFLICT,
            `"${gear?.name ?? "Item"}" is not available in the requested quantity. Available: ${gear?.stock ?? 0}`,
          );
        }

        totalAmount += gear.rentalPrice * item.quantity * days;

        rentalItemsData.push({
          gearItemId: gear.id,
          quantity: item.quantity,
          pricePerDay: gear.rentalPrice,
          days,
        });

        await tx.gearItem.update({
          where: { id: gear.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.rentalOrder.create({
        data: {
          customerId,
          startDate: input.startDate,
          endDate: input.endDate,
          totalAmount,
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

  async requestReturn(customerId: string, orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, "Rental order not found.");
    }

    if (order.customerId !== customerId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only request a return on your own orders.",
      );
    }

    if (order.status !== "PICKED_UP") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You can only request a return for gear that has been picked up.",
      );
    }

    const hasCompletedPayment = order.payments.some(
      (p) => p.status === "COMPLETED",
    );
    if (!hasCompletedPayment) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This order must be fully paid before a return can be requested.",
      );
    }

    if (order.returnRequested) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A return has already been requested for this order.",
      );
    }

    return prisma.rentalOrder.update({
      where: { id: orderId },
      data: {
        returnRequested: true,
        returnRequestedAt: new Date(),
      },
    });
  },

async releaseStock(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.findUnique({
      where: { id: orderId },
      include: { rentalItems: true },
    });
    if (!order) return null;
    if (order.status !== "CONFIRMED") return order;

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
          include: {
            gearItem: { select: { id: true, name: true, image: true } },
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            method: true,
            paidAt: true,
          },
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
