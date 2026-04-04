import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { MatchSuggestion } from './src/models/matchSuggestion.model.js';

dotenv.config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected to DB');
        const count = await User.countDocuments();
        console.log('Total users:', count);
        
        const suggestionsCount = await MatchSuggestion.countDocuments();
        console.log('Total MatchSuggestions:', suggestionsCount);

        const users = await User.find({}, 'clerkId username profile.personalInfo.name').limit(5);
        console.log('Sample users:', JSON.stringify(users, null, 2));
        
        if (users.length > 0) {
            const firstUser = users[0];
            const userSuggestions = await MatchSuggestion.countDocuments({ userId: firstUser._id });
            console.log(`Suggestions for ${firstUser.username}:`, userSuggestions);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
