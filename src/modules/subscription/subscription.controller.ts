import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { subscriptionServices } from "./subscription.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const createCheckOutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    const result = await subscriptionServices.createSubscriptionService(
      userId as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Subscription created successfully",
      data: result,
    });
  },
);

const handleStripeWebhook = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const event = req.body as Buffer;
    const signature = req.headers["stripe-signature"] as string;
    await subscriptionServices.handleStripeWebhook(event, signature);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Subscription created successfully",
      data: null,
    });
  },
);
export const subscriptionController = {
  createCheckOutSession,
  handleStripeWebhook
};
