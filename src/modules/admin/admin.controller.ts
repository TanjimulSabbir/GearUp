import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";
import { categoryService } from "../category/category.service";

export const adminController = {
  getAllUsers: catchAsync(async (_req: Request, res: Response) => {
    const users = await adminService.getAllUsers();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "All users fetched",
      data: users,
    });
  }),

  updateUserStatus: catchAsync(async (req: Request, res: Response) => {
    const user = await adminService.updateUserStatus(
      req.params.id as string,
      req.body.accountStatus,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User status updated",
      data: user,
    });
  }),

  getAllGear: catchAsync(async (req: Request, res: Response) => {
    const gear = await adminService.getAllGear(req.query);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "All gear listings fetched",
      data: gear,
    });
  }),

  getAllRentals: catchAsync(async (_req: Request, res: Response) => {
    const rentals = await adminService.getAllRentals();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "All rental orders fetched",
      data: rentals,
    });
  }),

  createCategory: catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.create(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Category created",
      data: category,
    });
  }),

  updateCategory: catchAsync(async (req: Request, res: Response) => {
    const category = await categoryService.update(req.params.id, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Category updated",
      data: category,
    });
  }),

  deleteCategory: catchAsync(async (req: Request, res: Response) => {
    await categoryService.remove(req.params.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Category deleted",
      data: null,
    });
  }),
};
