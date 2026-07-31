import { Router } from "express";
import { userController } from "../user/user.controller";
import { authController } from "./auth.controller";
import { validate } from "../../utils/errors/zod.error";
import { loginSchema, signupSchema } from "./auth.validation";

const router = Router();

router.post("/signup", validate(signupSchema), userController.registerUser)
router.post("/login",validate(loginSchema), authController.loginUser)

router.post("/refresh-token", authController.refreshToken)

export const authRoutes = router;
