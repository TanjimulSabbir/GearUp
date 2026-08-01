import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";

import { sendResponse } from "../../utils/sendResponse";
import { gearServices } from "./gear.service";

export const gearController = {
  createGearItem: catchAsync(
    async (req: Request, res: Response, _next: NextFunction) => {
      const data = await gearServices.createGearItem(req.user, req.body);

      sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Gear items created successfully",
        data,
      });
    },
  ),

  getAllGear: catchAsync(async (req: Request, res: Response) => {
    const data = await gearServices.getAllGear(req.query);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear items fetched successfully",
      data,
    });
  }),

  getGearById: catchAsync(async (req: Request, res: Response) => {
    const data = await gearServices.getGearById(req.params.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear item fetched successfully",
      data,
    });
  }),

  updateGear: catchAsync(async (req: Request, res: Response) => {
    const data = await gearServices.updateGear(req.params.id, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear item updated successfully",
      data,
    });
  }),

  deleteGear: catchAsync(async (req: Request, res: Response) => {
    const data = await gearServices.deleteGear(req.params.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear item deleted successfully",
      data,
    });
  }),
};
