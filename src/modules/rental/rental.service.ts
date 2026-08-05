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

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const rentalItemsData: RentalItemCreateData[] = [];

      for (const item of input.items) {
        const gear = await tx.gearItem.findFirst({
          where: { id: item.gearItemId, isAvailable: true },
        });

        if (!gear) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            `Gear item ${item.gearItemId} not found or unavailable.`,
          );
        }

        if (gear.stock < item.quantity) {
          throw new AppError(
            httpStatus.CONFLICT,
            `Insufficient stock for "${gear.name}". Available: ${gear.stock}`,
          );
        }

        totalAmount += gear.rentalPrice * item.quantity * days;

        rentalItemsData.push({
          gearItemId: gear.id,
          quantity: item.quantity,
          pricePerDay: gear.rentalPrice, // snapshot, protects against future price changes
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

  /**
   * Provider confirms a PLACED rental order, moving it to CONFIRMED.
   * This is the missing link that unblocks payment: payment.service
   * refuses to create a checkout session for anything but a CONFIRMED order.
   * Route this behind auth("PROVIDER") and verify the provider owns the gear.
   */
  async confirm(providerId: string, orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { rentalItems: { include: { gearItem: true } } },
    });
    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, "Rental order not found.");
    }

    const isProviderOfItem = order.rentalItems.some(
      (item) => item.gearItem.providerId === providerId,
    );
    if (!isProviderOfItem) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not provide any items in this order.",
      );
    }

    if (order.status !== "PLACED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order in status ${order.status} cannot be confirmed.`,
      );
    }

    return prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
    });
  },

  /**
   * Compensating transaction: called when a payment fails or its checkout
   * session expires. Puts the reserved stock back and moves the order to
   * a terminal failed state so it's clearly distinguishable from a normal
   * customer cancellation. Idempotent — safe to call more than once.
   */
  async releaseStock(orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { rentalItems: true },
    });
    if (!order) return null;

    // Only release if the order hasn't already been resolved another way
    // (e.g. already PAID, or already released once).
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