import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { rentalService } from "./rental.service";

export const rentalController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const order = await rentalService.create(req.user!.id, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      // Fixed: previous message said "check your email" — no email/notification
      // service exists anywhere in this codebase. Left as an accurate
      // description of what actually happens instead. Add the email step
      // first (or a GET /rentals/:id poll on the frontend) before promising
      // it in the response message again.
      message: "Rental order created successfully. Waiting for provider confirmation before you can pay.",
      data: order,
    });
  }),

  getMine: catchAsync(async (req: Request, res: Response) => {
    const orders = await rentalService.getMine(req.user!.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Rental orders fetched successfully",
      data: orders,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const order = await rentalService.getById(
      req.user!.id,
      req.user!.role,
      req.params.id as string,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Rental order fetched successfully",
      data: order,
    });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const order = await rentalService.cancel(req.user!.id, req.params.id as string);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Rental order cancelled successfully",
      data: order,
    });
  }),
};