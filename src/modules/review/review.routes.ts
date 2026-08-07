import { Router } from "express";
import { reviewController } from "./review.controller";
import { createReviewSchema } from "./review.validation";
import { auth } from "../../middlewares/auth";
import { validate } from "../../utils/errors/zod.error";

const router = Router();

router.post(
  "/",
  auth("CUSTOMER"),
  validate(createReviewSchema),
  reviewController.create,
);

export const reviewRoutes = router;
