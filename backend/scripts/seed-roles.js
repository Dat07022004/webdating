import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Setup basic env for script if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log("No .env found, assuming MONGO_URI is set");
}

import { User } from '../src/models/user.model.js';

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/webdating";

async function seed() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Admin Account
        const adminEmail = 'admin@webdating.com';
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
            const adminSalt = await bcrypt.genSalt(10);
            const adminPasswordHash = await bcrypt.hash('admin123', adminSalt);
            
            await User.create({
                clerkId: 'mock_admin_clerk_id',
                email: adminEmail,
                username: 'admin',
                passwordHash: adminPasswordHash,
                role: 'admin',
                isVerified: true,
                profile: { personalInfo: { name: 'System Admin' } }
            });
            console.log('Admin account created: admin@webdating.com / admin123');
        } else {
            console.log('Admin account already exists.');
        }

        // 2. User Account
        const userEmail = 'user@webdating.com';
        const existingUser = await User.findOne({ email: userEmail });
        
        if (!existingUser) {
            const userSalt = await bcrypt.genSalt(10);
            const userPasswordHash = await bcrypt.hash('user123', userSalt);
            
            await User.create({
                clerkId: 'mock_user_clerk_id',
                email: userEmail,
                username: 'regular_user',
                passwordHash: userPasswordHash,
                role: 'user',
                isVerified: true,
                profile: { personalInfo: { name: 'Regular User' } }
            });
            console.log('User account created: user@webdating.com / user123');
        } else {
            console.log('User account already exists.');
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seed();