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

import { functions, inngest } from "./config/inngest.js";
import http from "http";
import { initSocket } from "./socket/index.js";
import cors from "cors";
import fs from "fs";

const app = express();
const defaultAllowedOrigins = [
  "https://heartly-webdating-frontend-8h1el.sevalla.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins]),
);

const isDynamicAllowedOrigin = (origin) => {
  return (
    /\.trycloudflare\.com$/i.test(origin) || /\.sevalla\.app$/i.test(origin)
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed =
      allowedOrigins.includes(origin) || isDynamicAllowedOrigin(origin);

    callback(null, isAllowed);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
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
    clockSkewInMs: 60 * 1000 * 5, // 5 minutes leeway
  }),
); // adds auth access on req via req.auth()

// Inngest requests require parsed JSON body.
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api", healthRoutes);

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
  const port = ENV.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
