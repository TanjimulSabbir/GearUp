import { Request, Response } from "express";
import Stripe from "stripe";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

export const paymentController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const result = await paymentService.createCheckoutSession(
      req.user!.id,
      req.body.rentalOrderId
    );
    sendResponse(res, {
      statusCode: 201,
      message: "Checkout session created",
      data: result,
    });
  }),

  // Client-side callback after Stripe redirects back with ?session_id=...
  confirm: catchAsync(async (req: Request, res: Response) => {
    const sessionId = (req.body.sessionId || req.query.session_id) as string;
    if (!sessionId) throw AppError.badRequest("sessionId is required");

    const payment = await paymentService.confirmBySessionId(sessionId);
    sendResponse(res, { statusCode: 200, message: "Payment status verified", data: payment });
  }),

  getMine: catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.getMine(req.user!.id);
    sendResponse(res, { statusCode: 200, message: "Payment history fetched", data: payments });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const payment = await paymentService.getById(req.user!.id, req.user!.role, req.params.id);
    sendResponse(res, { statusCode: 200, message: "Payment fetched", data: payment });
  }),

  // Stripe webhook - mounted with express.raw() body parsing (see app.ts)
  webhook: async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        signature,
        env.stripe.webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return res.status(400).json({ success: false, message: `Webhook signature verification failed: ${message}`, errorDetails: null });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.markCompleted(session.id, session.payment_intent as string);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.markFailed(session.id);
        break;
      }
      default:
        break; // ignore other event types
    }

    res.json({ received: true });
  },
};
