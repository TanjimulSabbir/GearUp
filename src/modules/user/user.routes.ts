import { Router } from "express";
import { validate } from "../../utils/errors/zod.error";
import { userController } from "../user/user.controller";
import { userRegisterSchema } from "./user.validation";

const router = Router();

router.post(
  "/signup",
  validate(userRegisterSchema),
  userController.registerUser,
);

export const userRoutes = router;