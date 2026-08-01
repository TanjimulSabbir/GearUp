import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../utils/errors/zod.error";
import { loginSchema } from "./auth.validation";

const router = Router();

router.post("/login", validate(loginSchema), authController.loginUser)

router.post("/refresh-token", authController.refreshToken)

export const authRoutes = router;
