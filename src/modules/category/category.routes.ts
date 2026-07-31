import { Router } from "express";
import { categoryController } from "./category.controller";

const router = Router();

// Public: anyone can view categories
router.get("/", categoryController.getAll);

export const categoryRoutes = router;
