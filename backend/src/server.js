import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { clerkMiddleware } from '@clerk/express';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { serve } from 'inngest/express';
import userRoutes from './routes/user.routes.js';
import healthRoutes from './routes/health.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import chatRoutes from './routes/chat.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import premiumRoutes from './routes/premium.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.route.js';
import revenueRoutes from './routes/revenue.routes.js';
import dateSpotsRoutes from './routes/dateSpots.routes.js';
import reviewRoutes from './routes/review.routes.js';
import { requireActiveUser } from './middleware/auth.middleware.js';
import { functions, inngest } from './config/inngest.js';
import { startReminderWorker } from './workers/reminderWorker.js';
import { initSocket } from './socket/index.js';
import cors from 'cors';
// Note: imports deduplicated to avoid redeclaration errors

const app = express();
const defaultAllowedOrigins = [
  "https://heartly-webdating-frontend-8h1e1.sevalla.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, "");

const allowedOrigins = new Set(
  [ENV.ALLOWED_ORIGINS, ENV.FRONTEND_URL]
    .flatMap((value) => {
      if (!value) return [];

      if (value.trim() === "*") {
        return ["*"];
      }

      return value
        .split(",")
        .map((item) => normalizeOrigin(item))
        .filter(Boolean);
    })
    .concat(defaultAllowedOrigins.map((origin) => normalizeOrigin(origin))),
);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.has("*") ||
      allowedOrigins.has(normalizeOrigin(origin))
    ) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("/{*path}", cors(corsOptions));
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
app.use('/api/inngest', serve({ client: inngest, functions }));
// Public health check
app.use('/api', healthRoutes);

// Protected API routes (require authenticated/active user)
app.use('/api/users', requireActiveUser, userRoutes);
app.use('/api/chat', requireActiveUser, chatRoutes);
app.use('/api/upload', requireActiveUser, uploadRoutes);
app.use('/api/premium', requireActiveUser, premiumRoutes);
app.use('/api/appointments', requireActiveUser, appointmentsRoutes);
app.use('/api/date-spots', requireActiveUser, dateSpotsRoutes);
app.use('/api/reviews', requireActiveUser, reviewRoutes);

// Admin and revenue endpoints
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/revenue', revenueRoutes);

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
  httpServer.listen(ENV.PORT, () => {
    console.log(`Server is running on port ${ENV.PORT}`);
  });
  // Start background reminder worker
  try {
    startReminderWorker();
  } catch (err) {
    console.error('Failed to start reminder worker', err);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
