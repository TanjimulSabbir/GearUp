import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { categoryService } from "./category.service";

export const categoryController = {
  getAll: catchAsync(async (_req: Request, res: Response) => {
    const categories = await categoryService.getAll();
    sendResponse(res, { statusCode: 200, message: "Categories fetched", data: categories });
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.create(req.body);
    sendResponse(res, { statusCode: 201, message: "Category created", data: category });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.update(req.params.id, req.body);
    sendResponse(res, { statusCode: 200, message: "Category updated", data: category });
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await categoryService.remove(req.params.id);
    sendResponse(res, { statusCode: 200, message: "Category deleted" });
  }),
};
