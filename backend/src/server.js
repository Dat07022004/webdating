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

import { functions, inngest } from "./config/inngest.js";
import http from "http";
import { initSocket } from "./socket/index.js";

const app = express();
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const _dirname = path.resolve();

app.use(express.json());
app.use(clerkMiddleware()); // adds auth access on req via req.auth()

// Inngest requests require parsed JSON body.
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", healthRoutes);

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(_dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(_dirname, "../frontend", "dist", "index.html"));
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
