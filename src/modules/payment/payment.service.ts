import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import AppError from "../../utils/errors/app.error";
import { rentalService } from "../rental/rental.service";
import config from "../../config";
import { Stripe } from "stripe";

export const paymentService = {
  async createCheckoutSession(customerId: string, rentalOrderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: rentalOrderId },
      include: { rentalItems: { include: { gearItem: true } } },
    });

    if (!order) throw new AppError(404, "Rental order not found");
    if (order.customerId !== customerId) {
      throw new AppError(403, "You do not own this rental order", {
        message: "You do not own this rental order",
        description:
          "The rental order you are trying to pay for does not belong to your account. Please check the order ID and ensure you are logged in with the correct account.",
        statusCode: 403,
      });
    }
    if (order.status === "RETURNED") {
      throw new AppError(400, "This rental order has already been returned", {
        message: "This rental order has already been returned",
        description:
          "The rental order you are trying to pay for has already been returned. No further payment is required for this order. If you need this order again, please create a new rental order.",
        statusCode: 400,
      });
    }

    if (order.status === "CANCELLED") {
      throw new AppError(400, "This rental order has already been cancelled", {
        message: "This rental order has already been cancelled",
        description:
          "The rental order you are trying to pay for has already been cancelled. No further payment is required for this order.",
        statusCode: 400,
      });
    }

    if (order.status === "PAID") {
      throw new AppError(400, "This rental order has already been paid", {
        message: "This rental order has already been paid",
        description:
          "The rental order you are trying to pay for has already been marked as paid. No further payment is required for this order.",
        statusCode: 400,
      });
    }

    if (order.status !== "CONFIRMED") {
      throw new AppError(
        400,
        `Order must be CONFIRMED by the provider before payment. Current status: ${order.status}`,
        {
          message: `Order must be CONFIRMED by the provider before payment. Current status: ${order.status}`,
          description: `The rental order you are trying to pay for must be CONFIRMED by the provider before payment. Current status: ${order.status}`,
          statusCode: 400,
        },
      );
    }

    const existingPending = await prisma.payment.findFirst({
      where: { rentalOrderId, status: "PENDING" },
    });

    if (existingPending?.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(
        existingPending.stripeSessionId,
      );
      if (session.status === "open") {
        return {
          url: session.url,
          sessionId: session.id,
          paymentId: existingPending.id,
        };
      }
    }

    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: undefined,
      line_items: order.rentalItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.gearItem.name },
          unit_amount: Math.round(item.pricePerDay * 100),
        },
        quantity: item.quantity * item.days,
      })),
      success_url: `${config.frontend_url}?payment=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontend_url}?payment=false`,
      metadata: { rentalOrderId, transactionId },
    });

    const payment = await prisma.payment.create({
      data: {
        transactionId,
        amount: order.totalAmount,
        method: "STRIPE",
        status: "PENDING",
        stripeSessionId: session.id,
        rentalOrderId,
      },
    });

    return { url: session.url, sessionId: session.id, paymentId: payment.id };
  },

  async markCompleted(session: Stripe.Checkout.Session) {
    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!payment) return null;
    if (payment.status === "COMPLETED") return payment;

    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          stripePaymentIntentId:
            (session.payment_intent as string | null) ?? undefined,
        },
      }),
      prisma.rentalOrder.update({
        where: { id: payment.rentalOrderId },
        data: { status: "PAID" },
      }),
    ]);

    return updatedPayment;
  },

  async markFailed(session: Stripe.Checkout.Session ) {
    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!payment || payment.status === "COMPLETED") return payment;

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    await rentalService.releaseStock(payment.rentalOrderId);

    return updated;
  },

  async confirmBySessionId(sessionId: string, customerId: string) {
    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: sessionId },
      include: { rentalOrder: true },
    });
    if (!payment) throw new AppError(404, "Checkout session not found");
    if (payment.rentalOrder.customerId !== customerId) {
      throw new AppError(403, "You do not have access to this payment");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) throw new AppError(404, "Checkout session not found");

    if (session.payment_status === "paid") {
      return this.markCompleted(session);
    }
    if (session.status === "expired") {
      return this.markFailed(session.id);
    }

    return payment;
  },

  async getMine(customerId: string) {
    return prisma.payment.findMany({
      where: { rentalOrder: { customerId } },
      include: {
        rentalOrder: { select: { id: true, status: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(customerId: string, role: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { rentalOrder: true },
    });
    if (!payment) throw new AppError(404, "Payment not found");

    if (payment.rentalOrder.customerId !== customerId && role !== "ADMIN") {
      throw new AppError(403, "You do not have access to this payment");
    }
    return payment;
  },
};
