import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import AppError from "../../utils/errors/app.error";
import { rentalService } from "../rental/rental.service"; // adjust path to match your folder layout
import config from "../../config";


export const paymentService = {
  async createCheckoutSession(customerId: string, rentalOrderId: string) {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: rentalOrderId },
      include: { rentalItems: { include: { gearItem: true } } },
    });

    if (!order) throw new AppError(404, "Rental order not found");
    if (order.customerId !== customerId) {
      throw new AppError(403, "You do not own this rental order");
    }
    if (order.status !== "CONFIRMED") {
      throw new AppError(400,
        `Order must be CONFIRMED by the provider before payment. Current status: ${order.status}`
      );
    }

    const existingPending = await prisma.payment.findFirst({
      where: { rentalOrderId, status: "PENDING" },
    });
    if (existingPending?.stripeSessionId) {
      // Reuse the existing pending session rather than creating duplicates.
      const session = await stripe.checkout.sessions.retrieve(existingPending.stripeSessionId);
      if (session.status === "open") {
        return { url: session.url, sessionId: session.id, paymentId: existingPending.id };
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
      cancel_url: `${config.frontend_url}?payment=false&session_id={CHECKOUT_SESSION_ID}`,
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

  /** Marks a payment COMPLETED and its order PAID. Idempotent. */
  async markCompleted(stripeSessionId: string, paymentIntentId?: string | null) {
    const payment = await prisma.payment.findUnique({ where: { stripeSessionId } });
    if (!payment) return null;
    if (payment.status === "COMPLETED") return payment; // already processed

    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId ?? undefined,
        },
      }),
      prisma.rentalOrder.update({
        where: { id: payment.rentalOrderId },
        data: { status: "PAID" },
      }),
    ]);

    return updatedPayment;
  },

  /**
   * Marks a payment FAILED and releases the reserved stock via
   * rentalService.releaseStock. Sets the order to a terminal PAYMENT_FAILED
   * state — this order cannot be paid again; the customer must place a
   * new rental order if they still want the gear.
   */
  async markFailed(stripeSessionId: string) {
    const payment = await prisma.payment.findUnique({ where: { stripeSessionId } });
    if (!payment || payment.status === "COMPLETED") return payment;

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    await rentalService.releaseStock(payment.rentalOrderId);

    return updated;
  },

  /** Client-side confirmation callback: verify the session directly with Stripe. */
  async confirmBySessionId(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) throw new AppError(404, "Checkout session not found");

    if (session.payment_status === "paid") {
      return this.markCompleted(sessionId, session.payment_intent as string);
    }
    if (session.status === "expired") {
      return this.markFailed(sessionId);
    }

    const payment = await prisma.payment.findUnique({ where: { stripeSessionId: sessionId } });
    return payment;
  },

  async getMine(customerId: string) {
    return prisma.payment.findMany({
      where: { rentalOrder: { customerId } },
      include: { rentalOrder: { select: { id: true, status: true, totalAmount: true } } },
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