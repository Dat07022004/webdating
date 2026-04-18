
import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { serve } from "inngest/express";
import userRoutes from "./routes/user.routes.js";
import healthRoutes from "./routes/health.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import premiumRoutes from "./routes/premium.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes from "./routes/admin.route.js";
import revenueRoutes from "./routes/revenue.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import dateSpotsRoutes from "./routes/dateSpots.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import { requireActiveUser } from "./middleware/auth.middleware.js";
import safetyRoutes from "./routes/safety.routes.js";


import { functions, inngest } from "./config/inngest.js";
import { initSocket } from "./socket/index.js";
import cors from "cors";

const app = express();
const corsOptions = {
  origin: [
    "https://heartly-webdating-frontend-8h1el.sevalla.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const _dirname = path.resolve();

app.use(express.json());
app.use(
  clerkMiddleware({
    secretKey: ENV.CLERK_SECRET_KEY,
    publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
    clockSkewInMs: 60 * 1000 * 5,
  }),
);

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/users", userRoutes);
app.use("/api/chat", requireActiveUser, chatRoutes);
app.use("/api/upload", requireActiveUser, uploadRoutes);
app.use("/api/premium", requireActiveUser, premiumRoutes);
app.use("/api/appointments", requireActiveUser, appointmentsRoutes);
app.use("/api/date-spots", requireActiveUser, dateSpotsRoutes);
app.use("/api/reviews", requireActiveUser, reviewRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api", healthRoutes);

const frontendDistPath = path.join(_dirname, "../frontend/dist");
if (fs.existsSync(path.join(frontendDistPath, "index.html"))) {
  app.use(express.static(frontendDistPath));

  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res
      .status(200)
      .send(
        "API Backend is running! (Note: The Frontend UI is not built or not served from this endpoint.)",
      );
  });
}

const startServer = async () => {
  await connectDB();
  httpServer.listen(ENV.PORT, () => {
    console.log(`Server is running on port ${ENV.PORT}`);
  });
};

 startServer();

export default app;
