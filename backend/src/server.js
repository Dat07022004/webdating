import express from 'express';
import path from 'path';
import { clerkMiddleware } from '@clerk/express'
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { serve } from 'inngest/express';
import userRoutes from './routes/user.routes.js';
import healthRoutes from './routes/health.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';

import { functions, inngest } from './config/inngest.js';
import { startReminderWorker } from './workers/reminderWorker.js';

const app = express();

const _dirname = path.resolve();

app.use(express.json());
app.use(clerkMiddleware()) // adds auth access on req via req.auth()

// Inngest requests require parsed JSON body.
app.use("/api/inngest",serve({client: inngest, functions}));
app.use('/api/users', userRoutes);
app.use('/api', healthRoutes);
app.use('/api/appointments', appointmentsRoutes);

if(ENV.NODE_ENV === 'production'){
    app.use(express.static(path.join(_dirname, "../frontend/dist"))); 

    app.get("/{*any}", (req, res) => {
        res.sendFile(path.join(_dirname, "../frontend", "dist", "index.html"));
    })
}
const startServer = async () => {
    await connectDB();
    app.listen(ENV.PORT, () => {
        console.log(`Server is running on port ${ENV.PORT}`);
    });
        // Start background reminder worker
        try {
            startReminderWorker();
        } catch (err) {
            console.error('Failed to start reminder worker', err);
        }
}
startServer();
