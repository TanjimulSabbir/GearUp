import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import path from "path";
import config from "./config";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { authRoutes } from "./modules/auth/auth.routes";
import { userRoutes } from "./modules/user/user.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { categoryRoutes } from "./modules/category/category.routes";
import { gearRoutes } from "./modules/gear/gear.routes";
import { providerRoutes } from "./modules/provider/provider.routes";
import { rentalRoutes } from "./modules/rental/rental.routes";

const app: Application = express();

app.use(
  cors({
    origin: config.clientOrigins,
    credentials: true,
  }),
);
app.use("/api/subscription/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});
app.get("/postman.json", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "post-man-v2.json"));
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/gear", gearRoutes);
app.use("/api/v1/provider", providerRoutes);
app.use("/api/v1/rentals", rentalRoutes);
 

app.use(notFound);

app.use(globalErrorHandler);

export default app;
