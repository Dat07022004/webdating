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
import adminRoutes from "./routes/admin.route.js";
import { requireActiveUser } from "./middleware/auth.middleware.js";

import { functions, inngest } from "./config/inngest.js";
import http from "http";
import { initSocket } from "./socket/index.js";
import cors from "cors";

const app = express();
app.use(cors({ origin: true, credentials: true })); // IMPORTANT: Required for frontend routing
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const _dirname = path.resolve();

app.use(express.json());
app.use(clerkMiddleware({
  secretKey: ENV.CLERK_SECRET_KEY,
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  clockSkewInMs: 60 * 1000 * 5 // 5 minutes leeway
})); // adds auth access on req via req.auth()

// Inngest requests require parsed JSON body.
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/users", requireActiveUser, userRoutes);
app.use("/api/chat", requireActiveUser, chatRoutes);
app.use("/api/upload", requireActiveUser, uploadRoutes);
app.use("/api/premium", requireActiveUser, premiumRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", healthRoutes);

import fs from 'fs';

const frontendDistPath = path.join(_dirname, "../frontend/dist");
// Only serve frontend if the front end build actually exists
if (fs.existsSync(path.join(frontendDistPath, "index.html"))) {
  app.use(express.static(frontendDistPath));

  // Express 5 requires named wildcards for catch-all paths.
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  // Fallback in case the wildcard above didn't get mounted (missing dist)
  app.get('/', (req, res) => {
    res.status(200).send("API Backend is running! (Note: The Frontend UI is not built or not served from this endpoint.)");
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
