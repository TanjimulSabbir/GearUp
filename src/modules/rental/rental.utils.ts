import { Prisma } from "../../../generated/prisma/client";

const STALE_HOURS = 24;

/**
 * Finds PLACED/CONFIRMED/PAYMENT_FAILED orders older than STALE_HOURS (from
 * order creation) with no COMPLETED payment, cancels them, and restocks their
 * gear. Runs inside the caller's transaction.
 */
export async function expireStaleReservations(
  tx: Prisma.TransactionClient,
  gearItemId?: string,
) {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

  const staleOrders = await tx.rentalOrder.findMany({
    where: {
      status: { in: ["PLACED", "CONFIRMED", "PAYMENT_FAILED"] },
      createdAt: { lte: cutoff },
      payments: { none: { status: "COMPLETED" } },
      ...(gearItemId ? { rentalItems: { some: { gearItemId } } } : {}),
    },
    include: { rentalItems: true },
  });

  let expiredCount = 0;

  for (const order of staleOrders) {
    const { count } = await tx.rentalOrder.updateMany({
      where: {
        id: order.id,
        status: { in: ["PLACED", "CONFIRMED", "PAYMENT_FAILED"] },
      },
      data: { status: "CANCELLED" },
    });
    if (count === 0) continue;

    await Promise.all(
      order.rentalItems.map((item) =>
        tx.gearItem.update({
          where: { id: item.gearItemId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );

    expiredCount += 1;
  }

  return expiredCount;
}
