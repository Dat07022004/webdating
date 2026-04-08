import mongoose from 'mongoose';
import {ENV} from "./env.js";
import { Review } from '../models/review.model.js';

export const connectDB = async () => {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    try {
        const conn = await mongoose.connect(ENV.DATABASE_URL)
        await Review.syncIndexes();
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}
