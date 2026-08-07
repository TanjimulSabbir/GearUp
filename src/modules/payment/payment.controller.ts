import { Request, Response } from "express";
import Stripe from "stripe";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { paymentService } from "./payment.service";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import AppError from "../../utils/errors/app.error";

export const paymentController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const result = await paymentService.createCheckoutSession(
      req.user!.id,
      req.body.rentalOrderId,
    );
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Checkout session created",
      data: result,
    });
  }),

  // Client-side callback after Stripe redirects back with ?session_id=...
  confirmIsPaid: catchAsync(async (req: Request, res: Response) => {
    const sessionId = (req.body.sessionId || req.query.session_id) as string;
    if (!sessionId) throw new AppError(400, "Missing session_id in request");
    const payment = await paymentService.confirmBySessionId(
      sessionId,
      req.user!.id,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "checkout session confirmed",
      data: payment,
    });
  }),

  getMine: catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.getMine(req.user!.id);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Payments retrieved successfully",
      data: payments,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const payment = await paymentService.getById(
      req.user!.id,
      req.user!.role,
      req.params.id as string,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Payment retrieved successfully",
      data: payment,
    });
  }),

  webhook: async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        signature,
        config.stripe_webhook_secret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return res.status(400).json({
        success: false,
        message: `Webhook signature verification failed: ${message}`,
        errorDetails: { error: err instanceof Error ? err.stack : undefined },
      });
    }

    if (!event) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature verification failed",
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.markCompleted(session);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.markFailed(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.markFailed(session);
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  },
};