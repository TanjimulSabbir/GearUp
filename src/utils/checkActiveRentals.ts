import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import AppError from "./errors/app.error";
export const checkActiveRentalConflict = async (
  customerId: string,
  gearIds: string[],
) => {
  const activeOrders = await prisma.rentalOrder.findMany({
    where: {
      customerId,
      rentalItems: {
        some: {
          gearItemId: {
            in: gearIds,
          },
        },
      },
      status: {
        in: [
          "PLACED",
          "CONFIRMED",
          "PAID",
          "PICKED_UP",
        ],
      },
    },
    include: {
      rentalItems: {
        include: {
          gearItem: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!activeOrders.length) return;

  const order = activeOrders[0];

  const gearNames = [
    ...new Set(
      order?.rentalItems
        .filter((item) => gearIds.includes(item.gearItemId))
        .map((item) => item.gearItem.name),
    ),
  ];

  const items = gearNames.join(", ");

  const errorMessages = {
    PLACED: {
      message:
        "You already ordered this gear item and your order is waiting for provider confirmation.",
      description: `Gear item(s): ${items}. Please wait until the provider confirms your rental request.`,
    },

    CONFIRMED: {
      message:
        "Your rental order is confirmed but payment is still pending.",
      description: `Gear item(s): ${items}. Please complete payment for your existing order before creating a new rental.`,
    },

    PAID: {
      message:
        "You already have a paid rental for this gear item.",
      description: `Gear item(s): ${items}. Please wait until the rental is completed and the gear is returned.`,
    },

    PICKED_UP: {
      message:
        "You cannot create a new rental for this gear until the current rental is returned.",
      description: `Gear item(s): ${items}. Please return the gear first before creating another rental.`,
    },
  };

  const error = errorMessages[order?.status as keyof typeof errorMessages];

  if (error) {
    throw new AppError(
      httpStatus.CONFLICT,
      error.message,
      {
        message: error.message,
        description: error.description,
        statusCode: 409,
      },
    );
  }
};