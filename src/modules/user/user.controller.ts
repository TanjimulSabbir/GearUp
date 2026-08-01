import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authService } from "../auth/auth.service";
import httpStatus from "http-status";
import { sendResponse } from "../../utils/sendResponse";

export const userController = {
  registerUser: catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const { user } = await authService.signupUser(payload);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User created successfully",
      data: user,
    });
  }),
};
