import { Router } from "express";
import { rentalController } from "./rental.controller";
import { auth } from "../../middlewares/auth";
import { validate } from "../../utils/errors/zod.error";


const router = Router();

router.post("/", auth("CUSTOMER"), validate(createRentalSchema), rentalController.create);
router.get("/", auth("CUSTOMER"), rentalController.getMine);
router.get("/:id", validate(rentalIdParamSchema), rentalController.getById);
router.patch(
  "/:id/cancel",
  auth("CUSTOMER"),
  validate(rentalIdParamSchema),
  rentalController.cancel
);

export const rentalRoutes = router;
