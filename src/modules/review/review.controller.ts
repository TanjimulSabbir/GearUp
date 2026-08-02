import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { reviewService } from "./review.service";

export const reviewController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const review = await reviewService.create(req.user!.id, req.body);
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Review created successfully",
      data: review,
    });
  }),
};
