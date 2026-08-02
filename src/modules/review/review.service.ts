import { prisma } from "../../lib/prisma";
import AppError from "../../utils/errors/app.error";
import httpStatus from "http-status";

export const reviewService = {
  async create(
    userId: string,
    input: {
      gearItemId: string;
      rentalOrderId: string;
      rating: number;
      comment: string;
    },
  ) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: input.rentalOrderId },
      include: { rentalItems: true },
    });
    if (!order)
      throw new AppError(httpStatus.NOT_FOUND, "Rental order not found");
    if (order.customerId !== userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only review your own rentals",
      );
    }
    if (order.status !== "RETURNED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You can only leave a review after the gear has been returned",
      );
    }

    const rentedThisItem = order.rentalItems.some(
      (i) => i.gearItemId === input.gearItemId,
    );
    if (!rentedThisItem) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This gear item was not part of the given rental order",
      );
    }

    const existing = await prisma.review.findUnique({
      where: {
        userId_gearItemId_rentalOrderId: {
          userId,
          gearItemId: input.gearItemId,
          rentalOrderId: input.rentalOrderId,
        },
      },
    });
    if (existing)
      throw new AppError(
        httpStatus.CONFLICT,
        "You already reviewed this gear item for this rental",
      );

    return prisma.review.create({
      data: {
        userId,
        gearItemId: input.gearItemId,
        rentalOrderId: input.rentalOrderId,
        rating: input.rating,
        comment: input.comment,
      },
    });
  },
};
