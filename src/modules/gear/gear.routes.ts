import Router from "express";
import { gearController } from "./gear.controller";

const router = Router();

router.get("/gear", gearController.getAllGear);

router.get("/gear/:gearId", gearController.getGearById);

export const gearRoutes = router;
