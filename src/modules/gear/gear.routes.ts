import {Router} from "express";
import { gearController } from "./gear.controller";

const router = Router();

router.get("/", gearController.getAllGear);

router.get("/:gearId", gearController.getGearById);

export const gearRoutes = router;
