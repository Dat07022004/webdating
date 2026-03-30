import express from "express";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { serve } from "inngest/express";
import userRoutes from "./routes/user.routes.js";
import healthRoutes from "./routes/health.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import premiumRoutes from "./routes/premium.routes.js";
import safetyRoutes from "./routes/safety.routes.js";

import { functions, inngest } from "./config/inngest.js";
import http from "http";
import { initSocket } from "./socket/index.js";
import cors from "cors";

const app = express();
app.use(cors({ origin: true, credentials: true })); 
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const _dirname = path.resolve();

app.use(express.json());
app.use(clerkMiddleware({
  secretKey: ENV.CLERK_SECRET_KEY,
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  clockSkewInMs: 60 * 1000 * 5 
})); 

// Routes
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/safety", safetyRoutes); // Registered Safety API
app.use("/api", healthRoutes);

import fs from 'fs';

const frontendDistPath = path.join(_dirname, "../frontend/dist");
if (fs.existsSync(path.join(frontendDistPath, "index.html"))) {
  app.use(express.static(frontendDistPath));

  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send("API Backend is running!");
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