import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { paymentController } from "./payment.controller";
import {
  createPaymentSchema,
  paymentIdParamSchema,
  confirmPaymentSchema,
} from "./payment.validation";
import { validate } from "../../utils/errors/zod.error";

const router = Router();

router.post(
  "/create",
  auth("CUSTOMER"),
  validate(createPaymentSchema),
  paymentController.create,
);

router.post(
  "/confirm",
  auth("CUSTOMER"),
  validate(confirmPaymentSchema),
  paymentController.confirmIsPaid,
);

router.get("/", auth("CUSTOMER"), paymentController.getMine);

router.get(
  "/:id",
  auth("CUSTOMER", "ADMIN"),
  validate(paymentIdParamSchema),
  paymentController.getById,
);

export const paymentRoutes = router;