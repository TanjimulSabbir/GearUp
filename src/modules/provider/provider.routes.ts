import { Router } from "express";
import { providerController } from "./provider.controller";
import {
  createGearItemSchema,
  updateGearItemSchema,
  updateOrderStatusSchema,
} from "./provider.validation";
import { auth } from "../../middlewares/auth";
import { validate } from "../../utils/errors/zod.error";

const router = Router();

router.use(auth("PROVIDER"));
router.post(
  "/gear",
  auth("PROVIDER"),
  validate(createGearItemSchema),
  providerController.createGearItem,
);

router.get("/gear", providerController.getMyGear);

router.put(
  "/gear/:id",
  validate(updateGearItemSchema),
  providerController.updateGear,
);
router.delete("/gear/:id", providerController.removeGear);

router.get("/orders", providerController.getMyOrders);
router.patch(
  "/orders/:id",
  validate(updateOrderStatusSchema),
  providerController.updateOrderStatus,
);

export const providerRoutes = router;
