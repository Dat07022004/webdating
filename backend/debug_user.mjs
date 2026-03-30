import mongoose from 'mongoose';
import { User } from './src/models/user.model.js';
import { Connection } from './src/models/connection.model.js';
import { Block } from './src/models/safety.js';

import dotenv from 'dotenv';
dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ 'profile.personalInfo.name': /Trần Đình Thắng/i });
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }

        console.log('Found User:', user._id, user.profile.personalInfo.name);
        
        const connections = await Connection.find({
            $or: [
                { senderId: user._id },
                { receiverId: user._id }
            ]
        });
        console.log('Connections count:', connections.length);
        connections.forEach(c => {
            console.log(`Conn: ${c._id} | From: ${c.senderId} | To: ${c.receiverId} | Status: ${c.status}`);
        });

        const blocks = await Block.find({
            $or: [
                { blockerId: user._id },
                { blockedId: user._id }
            ]
        });
        console.log('Blocks count:', blocks.length);
        blocks.forEach(b => {
            console.log(`Block: ${b.blockerId} -> ${b.blockedId}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
