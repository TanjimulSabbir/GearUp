import Router from "express";
import { auth } from "../../middlewares/auth";
import { validate } from "../../utils/errors/zod.error";
import { createGearItemSchema } from "./gear.validation";
import { gearController } from "./gear.controller";

const router = Router();

router.post(
  "/gear",
  auth("PROVIDER"),
  validate(createGearItemSchema),
  gearController.createGearItem,
);

router.get("/gear",gearController.getAllGearItems);

router.get("/gear/:gearId", gearController.getGearItemById);

router.put("/gear/:gearId", auth("PROVIDER"),gearController.updateGearItemById);

router.delete("/gear/:gearId", auth("PROVIDER"), gearController.deleteGearItemById);

export const gearRoutes = router;
