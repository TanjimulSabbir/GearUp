import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate, restrictTo } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createPaymentSchema, paymentIdParamSchema } from "./payment.validation";

const router = Router();

router.use(authenticate);

router.post("/create", restrictTo("CUSTOMER"), validate(createPaymentSchema), paymentController.create);
router.post("/confirm", restrictTo("CUSTOMER"), paymentController.confirm);
router.get("/", restrictTo("CUSTOMER"), paymentController.getMine);
router.get("/:id", validate(paymentIdParamSchema), paymentController.getById);

export const paymentRoutes = router;
