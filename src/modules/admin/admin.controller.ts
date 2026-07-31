import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";
import { categoryService } from "../category/category.service";

export const adminController = {
  getAllUsers: catchAsync(async (_req: Request, res: Response) => {
    const users = await adminService.getAllUsers();
    sendResponse(res, { statusCode: 200, message: "All users fetched", data: users });
  }),

  updateUserStatus: catchAsync(async (req: Request, res: Response) => {
    const user = await adminService.updateUserStatus(req.params.id, req.body.status);
    sendResponse(res, { statusCode: 200, message: "User status updated", data: user });
  }),

  getAllGear: catchAsync(async (_req: Request, res: Response) => {
    const gear = await adminService.getAllGear();
    sendResponse(res, { statusCode: 200, message: "All gear listings fetched", data: gear });
  }),

  getAllRentals: catchAsync(async (_req: Request, res: Response) => {
    const rentals = await adminService.getAllRentals();
    sendResponse(res, { statusCode: 200, message: "All rental orders fetched", data: rentals });
  }),

  // Category management (admin)
  createCategory: catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.create(req.body);
    sendResponse(res, { statusCode: 201, message: "Category created", data: category });
  }),

  updateCategory: catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.update(req.params.id, req.body);
    sendResponse(res, { statusCode: 200, message: "Category updated", data: category });
  }),

  deleteCategory: catchAsync(async (req: Request, res: Response) => {
    await categoryService.remove(req.params.id);
    sendResponse(res, { statusCode: 200, message: "Category deleted" });
  }),
};
