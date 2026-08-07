import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";

import { sendResponse } from "../../utils/sendResponse";
import { gearServices } from "./gear.service";
import { TGetAllGearQuery } from "./gear.validation";


export const gearController = {
  getAllGear: catchAsync(async (req: Request, res: Response) => {
    const data = await gearServices.getAllGear(req.query as unknown as TGetAllGearQuery);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear items fetched successfully",
      data,
    });
  }),

  getGearById: catchAsync(async (req: Request, res: Response) => {
    const data = await gearServices.getGearById(req.params.id as string);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Gear item fetched successfully",
      data,
    });
  }),
};
