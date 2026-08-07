import { Router } from "express";
import { gearController } from "./gear.controller";
import { validate } from "../../utils/errors/zod.error";
import { getAllGearSchema, getGearByIdSchema } from "./gear.validation";

const router = Router();

router.get("/", validate(getAllGearSchema), gearController.getAllGear);

router.get("/:id", validate(getGearByIdSchema), gearController.getGearById);

export const gearRoutes = router;
