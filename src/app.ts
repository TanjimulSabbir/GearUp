import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import path from "path";
import config from "./config";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { authRoutes } from "./modules/auth/auth.routes";
import { commentRoutes } from "./modules/comment/comment.route";
import { likeRoutes } from "./modules/like/like.route";
import { notificationRoutes } from "./modules/notification/notification.route";
import { postRoutes } from "./modules/post/post.route";
import { userRoutes } from "./modules/user/user.route";
import { subscriptionRoutes } from "./modules/subscription/subscription.route";

const app: Application = express();

app.use(
  cors({
    origin: config.clientOrigins,
    credentials: true,
  }),
);app.use("/api/subscription/webhook", express.raw({ type: 'application/json' }))


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});
app.get("/postman.json", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "post-man-v2.json"));
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use(notFound);

app.use(globalErrorHandler);

export default app;
