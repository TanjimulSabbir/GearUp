import { Router } from "express";
import { authenticate, restrictTo } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateGearSchema } from "../gear/gear.validation";
import { providerController } from "./provider.controller";
import {
  createGearItemSchema,
  updateOrderStatusSchema,
} from "./provider.validation";
import { auth } from "../../middlewares/auth";

const router = Router();

router.use(authenticate, restrictTo("PROVIDER"));
router.post(
  "/gear",
  auth("PROVIDER"),
  validate(createGearItemSchema),
  providerController.createGearItem,
);

router.get("/gear", providerController.getMyGear);
router.put(
  "/gear/:id",
  validate(updateGearSchema),
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
