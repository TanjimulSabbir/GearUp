import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { rentalService } from "./rental.service";

export const rentalController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const order = await rentalService.create(req.user!.id, req.body);
    sendResponse(res, { statusCode: 201, message: "Rental order created", data: order });
  }),

  getMine: catchAsync(async (req: Request, res: Response) => {
    const orders = await rentalService.getMine(req.user!.id);
    sendResponse(res, { statusCode: 200, message: "Rental orders fetched", data: orders });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const order = await rentalService.getById(req.user!.id, req.user!.role, req.params.id);
    sendResponse(res, { statusCode: 200, message: "Rental order fetched", data: order });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const order = await rentalService.cancel(req.user!.id, req.params.id);
    sendResponse(res, { statusCode: 200, message: "Rental order cancelled", data: order });
  }),
};
