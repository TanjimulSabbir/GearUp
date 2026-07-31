import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { subscriptionController } from "./subscription.controller";

const router = Router();

router.post("/checkout",
    auth(Role.USER, Role.ADMIN, Role.AUTHOR),
    subscriptionController.createCheckOutSession );

router.post("/webhook", subscriptionController.handleStripeWebhook);

export const subscriptionRoutes = router;