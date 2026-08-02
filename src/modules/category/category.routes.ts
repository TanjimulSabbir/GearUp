import { Router } from "express";
import { categoryController } from "./category.controller";

const router = Router();

router.get("/", categoryController.getAll);

export const categoryRoutes = router;
