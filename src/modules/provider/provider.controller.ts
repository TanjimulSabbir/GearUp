import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { providerServices } from "./provider.service";
import httpStatus from "http-status";
import AppError from "../../utils/errors/app.error";

export const providerController = {
  createGearItem: catchAsync(async (req: Request, res: Response) => {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return new AppError(
        httpStatus.BAD_REQUEST,
        "Request body must be a non-empty array of gear items",
        {
          message: "Request body must be a non-empty array of gear items",
          description:
            "The request body must be an array of gear items to create. Please provide at least one gear item with array.",
        },
      );
    }
    const data = await providerServices.createGearItems(
      req.user?.id as string,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear items created successfully",
      data,
    });
  }),

  getMyGear: catchAsync(async (req: Request, res: Response) => {
    const data = await providerServices.getMyGear(req.user!.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear items fetched successfully",
      data,
    });
  }),

  updateGear: catchAsync(async (req: Request, res: Response) => {
    const data = await providerServices.updateGear(
      req.user!.id,
      req.params.id as string,
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear item updated successfully",
      data,
    });
  }),

  removeGear: catchAsync(async (req: Request, res: Response) => {
    const data = await providerServices.removeGear(
      req.user!.id,
      req.params.id as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear item removed successfully",
      data,
    });
  }),

  getMyOrders: catchAsync(async (req: Request, res: Response) => {
    const data = await providerServices.getMyOrders(req.user!.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear orders fetched successfully",
      data,
    });
  }),

  updateOrderStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await providerServices.updateOrderStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear order status updated successfully",
      data,
    });
  }),
};
