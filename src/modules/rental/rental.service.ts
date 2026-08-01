import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";

interface CreateRentalInput {
  startDate: Date;
  endDate: Date;
  notes?: string;
  items: { gearItemId: string; quantity: number }[];
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
      const orderItemsData: {
        gearItemId: string;
        quantity: number;
        pricePerDay: number;
        days: number;
        subtotal: number;
      }[] = [];

      for (const item of input.items) {
        const gear = await tx.gearItem.findFirst({
          where: { id: item.gearItemId, isActive: true },
        });
        if (!gear) {
          throw AppError.notFound(`Gear item ${item.gearItemId} not found or unavailable`);
        }
        if (gear.availableStock < item.quantity) {
          throw AppError.conflict(
            `Insufficient stock for "${gear.name}". Available: ${gear.availableStock}`
          );
        }

        const subtotal = gear.pricePerDay * item.quantity * days;
        totalAmount += subtotal;

        orderItemsData.push({
          gearItemId: gear.id,
          quantity: item.quantity,
          pricePerDay: gear.pricePerDay,
          days,
          subtotal,
        });

        await tx.gearItem.update({
          where: { id: gear.id },
          data: { availableStock: { decrement: item.quantity } },
        });
      }

      const order = await tx.rentalOrder.create({
        data: {
          customerId,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes,
          totalAmount,
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { gearItem: { select: { id: true, name: true, images: true } } } },
        },
      });

      return order;
    });
  },

  async getMine(customerId: string) {
    return prisma.rentalOrder.findMany({
      where: { customerId },
      include: {
        items: { include: { gearItem: { select: { id: true, name: true, images: true } } } },
        payments: { select: { id: true, status: true, amount: true, method: true, paidAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(customerId: string, role: string, orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { gearItem: true } },
        payments: true,
        customer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) throw AppError.notFound("Rental order not found");

    const isOwner = order.customerId === customerId;
    const isAdmin = role === "ADMIN";
    const isProviderOfItem = order.items.some(
      (i) => "providerId" in i.gearItem && (i.gearItem as any).providerId === customerId
    );

    if (!isOwner && !isAdmin && !isProviderOfItem) {
      throw AppError.forbidden("You do not have access to this rental order");
    }

    return order;
  },

  async cancel(customerId: string, orderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw AppError.notFound("Rental order not found");
    if (order.customerId !== customerId) {
      throw AppError.forbidden("You can only cancel your own orders");
    }
    if (!["PLACED", "CONFIRMED"].includes(order.status)) {
      throw AppError.badRequest(`Order in status ${order.status} cannot be cancelled`);
    }

    return prisma.$transaction(async (tx) => {
      await Promise.all(
        order.items.map((item) =>
          tx.gearItem.update({
            where: { id: item.gearItemId },
            data: { availableStock: { increment: item.quantity } },
          })
        )
      );

      return tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });
    });
  },
};
