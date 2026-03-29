import { User } from '../models/user.model.js';
import { UserBanned } from '../models/userBanned.model.js';
import { Connection } from '../models/connection.model.js';
import { createClerkClient } from '@clerk/express';
import { ENV } from '../config/env.js';

const clerkClient = createClerkClient({
  secretKey: ENV.CLERK_SECRET_KEY,
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
});

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('_id clerkId email username role profile status createdAt');
        
        // Let's also find who is banned so frontend can show the status
        const bannedUsers = await UserBanned.find().select('userId reason expiresAt');
        const bannedMap = new Map();
        bannedUsers.forEach(b => bannedMap.set(b.userId.toString(), b));

        const mappedUsers = users.map(user => {
            const userObj = user.toObject();
            if (bannedMap.has(user._id.toString())) {
                userObj.bannedInfo = bannedMap.get(user._id.toString());
                userObj.isBanned = true;
            } else {
                userObj.isBanned = false;
            }
            return userObj;
        });

        res.status(200).json({ users: mappedUsers });
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, expiresAt } = req.body;
        const adminId = req.user._id;

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Cannot ban another admin' });
        }

        const existingBan = await UserBanned.findOne({ userId });
        if (existingBan) {
            return res.status(400).json({ message: 'User is already banned' });
        }

        const newBan = new UserBanned({
            userId,
            bannedBy: adminId,
            reason: reason || 'Violation of terms',
            expiresAt: expiresAt || null
        });

        await newBan.save();
        
        // In a real scenario we could also revoke clerk active sessions here:
        // await clerkClient.users.banUser(targetUser.clerkId);
        // But for simplicity, our own middleware could check UserBanned before allowing access.
        // Wait, Clerk allows banning directly? Yes, clerkClient.users.banUser exists, but let's stick to our local DB.

        res.status(200).json({ message: `Successfully banned ${targetUser.username}`, banInfo: newBan });
    } catch (error) {
         console.error('Error banning user:', error);
         res.status(500).json({ message: 'Server error when banning user' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete an admin from dashboard' });
        }

        // Delete from clerk
        if (targetUser.clerkId && !targetUser.clerkId.includes('fake_')) {
            try {
                await clerkClient.users.deleteUser(targetUser.clerkId);
            } catch (clerkError) {
                console.error("Clerk deletion failed (might be already deleted or invalid mock id):", clerkError.message);
                // Proceed to delete from db if clerk fails
            }
        }

        // Cascade delete relations: Connections, Bans, etc.
        await Connection.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
        await UserBanned.deleteOne({ userId });

        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: 'User completely deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error when deleting user' });
    }
};

export const changeUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const adminId = req.user._id;

        if (!['admin', 'manager', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser._id.toString() === adminId.toString()) {
            return res.status(403).json({ message: 'Cannot change your own role here' });
        }

        targetUser.role = role;
        await targetUser.save();

        res.status(200).json({ message: `Role changed to ${role}`, user: targetUser });
    } catch (error) {
        console.error('Error changing user role:', error);
        res.status(500).json({ message: 'Server error when changing role' });
    }
};
