import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { categoryService } from "./category.service";
import httpStatus from "http-status";

export const categoryController = {
  getAll: catchAsync(async (req: Request, res: Response) => {
    const categories = await categoryService.getAll(req.query);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Categories fetched successfully",
      data: categories,
    });
  }),
};
