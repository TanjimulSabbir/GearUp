import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { providerServices } from "./provider.service";
import httpStatus from "http-status";

export const providerController = {
  createGearItem: catchAsync(async (req: Request, res: Response) => {
    const data = await providerServices.createBulkGearItems(
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
