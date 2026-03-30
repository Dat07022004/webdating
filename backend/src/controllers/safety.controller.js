import { Block, Report } from '../models/safety.js';
import { User } from '../models/user.model.js';
import { Connection } from '../models/connection.model.js';

export const handleReportAndBlock = async (req, res) => {
    try {
        const { reportedId, reason, details, shouldBlock } = req.body;
        
        // Resolve auth context from Clerk
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        const clerkId = auth?.userId;

        if (!clerkId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const currentUser = await User.findOne({ clerkId });
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 1. Create and save the Report
        const report = new Report({
            reporterId: currentUser._id,
            reportedId,
            reason,
            details: details || ""
        });
        await report.save();

        // 2. If user opted to block, create or update the Block record
        if (shouldBlock) {
            await Block.findOneAndUpdate(
                { blockerId: currentUser._id, blockedId: reportedId },
                { blockerId: currentUser._id, blockedId: reportedId },
                { upsert: true, new: true }
            );

            // 3. Update or create a Connection with "blocked" status to ensure they don't see each other
            await Connection.findOneAndUpdate(
                {
                    $or: [
                        { senderId: currentUser._id, receiverId: reportedId },
                        { senderId: reportedId, receiverId: currentUser._id }
                    ]
                },
                { status: 'blocked' },
                { upsert: false } // Only update if it exists, if not, discover will filter by Block table anyway
            );
        }

        res.status(201).json({ 
            success: true, 
            message: "Action completed successfully. Thank you for your feedback." 
        });
    } catch (error) {
        console.error("Safety Controller Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getBlockedUsers = async (req, res) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        const clerkId = auth?.userId;

        if (!clerkId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const currentUser = await User.findOne({ clerkId });
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const blocks = await Block.find({ blockerId: currentUser._id })
            .populate({
                path: 'blockedId',
                select: 'profile username'
            });

        const blockedUsers = blocks
            .filter(block => block.blockedId) // Ensure user still exists
            .map(block => ({
                id: block.blockedId._id,
                name: block.blockedId.profile.personalInfo.name || block.blockedId.username,
                image: block.blockedId.profile.avatarUrl || block.blockedId.profile.photos[0]?.url || "",
                age: block.blockedId.profile.personalInfo.age,
                blockedAt: block.createdAt
            }));

        res.status(200).json({ success: true, data: blockedUsers });
    } catch (error) {
        console.error("Get Blocked Users Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        const clerkId = auth?.userId;

        if (!clerkId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const currentUser = await User.findOne({ clerkId });
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await Block.findOneAndDelete({ blockerId: currentUser._id, blockedId: targetUserId });

        // 4. Update Connection status from "blocked" back to "rejected" (or delete it) 
        // so they can potentially find each other again in Discover (depending on your logic)
        // Here we'll delete it so they can re-appear in Discover
        await Connection.findOneAndDelete({
            $or: [
                { senderId: currentUser._id, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: currentUser._id }
            ],
            status: 'blocked'
        });

        res.status(200).json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        console.error("Unblock User Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};