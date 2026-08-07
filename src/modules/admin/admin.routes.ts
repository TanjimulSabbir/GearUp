import { Router } from "express";
import { adminController } from "./admin.controller";
import { updateUserStatusSchema } from "./admin.validation";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../category/category.validation";
import { auth } from "../../middlewares/auth";
import { validate } from "../../utils/errors/zod.error";

const router = Router();

router.use(auth("ADMIN"));

router.get("/users", adminController.getAllUsers);

router.patch(
  "/users/:id",
  validate(updateUserStatusSchema),
  adminController.updateUserStatus,
);

router.get("/gear", adminController.getAllGear);
router.get("/rentals", adminController.getAllRentals);

router.post(
  "/categories",
  validate(createCategorySchema),
  adminController.createCategory,
);
router.put(
  "/categories/:id",
  validate(updateCategorySchema),
  adminController.updateCategory,
);
router.delete("/categories/:id", adminController.deleteCategory);

export const adminRoutes = router;
