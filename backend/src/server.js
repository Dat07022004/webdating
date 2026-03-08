import express from 'express';
import path from 'path';
import { clerkMiddleware } from '@clerk/express'
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { serve } from 'inngest/express';

import { functions, inngest } from './config/inngest.js';

const app = express();

const _dirname = path.resolve();


app.use(express.json());
app.use(clerkMiddleware()) // adds auth object under the req => req.auth

app.use("/api/inngest",serve({client: inngest, functions}));

app.get("/api/health", (req, res) =>{
    res.status(200).json({ messsage: "OK" });
} );

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
}
startServer();
