import { ENV } from '../config/env.js';
import {
    getUserProfile,
    saveUserOnboarding,
    updateUserProfile,
    uploadUserPhotosToCloudinary
} from '../services/user.service.js';
import { User } from '../models/user.model.js';
import { Connection } from '../models/connection.model.js';
import { MatchSuggestion } from '../models/matchSuggestion.model.js';
import { Block } from '../models/safety.js';

const resolveAuthContext = (req) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        return auth || null;
    } catch (error) {
        if (ENV.NODE_ENV !== 'production') {
            console.warn('Auth resolution failed in development, using fallback clerkId when provided:', error?.message || error);
            return null;
        }

        throw error;
    }
};

export const onboardUser = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await saveUserOnboarding({ clerkId, auth, body: req.body });
        return res.status(200).json({ message: 'Onboarding data saved' });
    } catch (error) {
        console.error('Onboarding save failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to save onboarding data' });
    }
};

export const uploadUserPhotos = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const photos = await uploadUserPhotosToCloudinary({ files: req.files || [], clerkId });
        return res.status(200).json({ photos });
    } catch (error) {
        console.error('Photo upload failed:', error);
        return res.status(500).json({ message: error?.message || 'Photo upload failed' });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.query?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;
        const email = auth?.sessionClaims?.email || req.query?.email;

        if (!clerkId && !email) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const profile = await getUserProfile({ clerkId, email });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        return res.status(200).json({ profile });
    } catch (error) {
        console.error('Profile fetch failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to load profile' });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;
        const email = auth?.sessionClaims?.email || req.body?.email;

        if (!clerkId && !email) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const profile = await updateUserProfile({ clerkId, email, body: req.body || {} });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        return res.status(200).json({ profile, message: 'Profile updated' });
    } catch (error) {
        console.error('Profile update failed:', error);
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        return res.status(statusCode).json({ message: error?.message || 'Failed to update profile' });
    }
};

export const getDiscoverUsers = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        if (!clerkId) return res.status(401).json({ message: 'Unauthorized' });

        const currentUser = await User.findOne({ clerkId });
        if (!currentUser) return res.status(404).json({ message: 'User not found' });

        // Get everyone I interacted with (sent or received) to completely filter them from discover
        const existingConnections = await Connection.find({
            $or: [
                { senderId: currentUser._id },
                { receiverId: currentUser._id }
            ]
        });

        // Also get blocked users (either I blocked them or they blocked me)
        const blockedRecords = await Block.find({
            $or: [
                { blockerId: currentUser._id },
                { blockedId: currentUser._id }
            ]
        });

        const excludedIds = [
            ...existingConnections.reduce((acc, curr) => {
                if (curr.senderId.toString() !== currentUser._id.toString()) acc.push(curr.senderId);
                if (curr.receiverId.toString() !== currentUser._id.toString()) acc.push(curr.receiverId);
                return acc;
            }, []),
            ...blockedRecords.reduce((acc, curr) => {
                if (curr.blockerId.toString() !== currentUser._id.toString()) acc.push(curr.blockerId);
                if (curr.blockedId.toString() !== currentUser._id.toString()) acc.push(curr.blockedId);
                return acc;
            }, []),
            currentUser._id // Exclude self too
        ];

        // MatchSuggestion.find logic to populate suggested users
        const suggestions = await MatchSuggestion.find({ userId: currentUser._id }).populate(
           'candidateUserId',
           '_id profile username status'
        );

        let candidates = suggestions
            .filter(s => s.candidateUserId && !excludedIds.some(id => id.toString() === s.candidateUserId._id.toString()))
            .map(s => s.candidateUserId);

        // If not enough suggestions, fallback to retrieving some users directly from User collection
        if (candidates.length === 0) {
            candidates = await User.find({
                _id: { $nin: excludedIds } // remove myself and people I interacted with
            }).limit(20).select('_id profile username status');
            
            // Generate DB MatchSuggestions to fulfill constraints
            if (candidates.length > 0) {
                 const suggestionDocs = candidates.map(c => ({
                     userId: currentUser._id,
                     candidateUserId: c._id,
                     score: 0.8
                 }));
                 try {
                     await MatchSuggestion.insertMany(suggestionDocs);
                 } catch (insertError) {
                     // Log error but don't fail - suggestions are optional, we still return the candidates
                     console.warn('Failed to insert MatchSuggestion records:', insertError.message);
                 }
            } else {
                console.log(`No candidates found for user ${currentUser._id}. Total excluded: ${excludedIds.length}`);
            }
        }

        const mappedUsers = candidates
            .filter(user => user && user._id) // Ensure valid user objects
            .map(user => ({
                id: user._id.toString(), // MONGODB ID!
                name: user.profile?.personalInfo?.name || user.username || 'Unknown',
                age: user.profile?.personalInfo?.age || 21,
                location: user.profile?.personalInfo?.locationText || 'Unknown location',
                bio: user.profile?.bio || 'No bio yet.',
                image: user.profile?.avatarUrl || user.profile?.photos?.find(p => p.isPrimary)?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop',
                interests: user.profile?.interests || [],
                verified: true,
                distance: 'Just now'
            }));

        return res.status(200).json({ users: mappedUsers });
    } catch (error) {
        console.error('Discover user fetch failed:', error.message, error.stack);
        const errorMessage = ENV.NODE_ENV === 'production' 
            ? 'Failed to fetch discover users' 
            : error?.message || 'Failed to fetch discover users';
        return res.status(500).json({ message: errorMessage });
    }
};

export const handleUserAction = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        if (!clerkId) return res.status(401).json({ message: 'Unauthorized' });

        const { targetUserId, action } = req.body;
        if (!targetUserId || !['like', 'pass'].includes(action)) {
            return res.status(400).json({ message: 'Invalid payload' });
        }

        const currentUser = await User.findOne({ clerkId });
        if (!currentUser) return res.status(404).json({ message: 'User not found' });

        // CONSTRAINT: Tránh lặp lại db 
        // Search in both directions to see if ANY connection exists between these two users.
        const existingConnection = await Connection.findOne({
            $or: [
                { senderId: currentUser._id, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: currentUser._id }
            ]
        });

        if (existingConnection) {
            // A connection already exists!
            const isTargetTheSender = existingConnection.senderId.toString() === targetUserId;

            if (isTargetTheSender && existingConnection.status === 'pending' && action === 'like') {
                // Target liked me first, and now I'm liking back!
                existingConnection.status = 'matched';
                await existingConnection.save();
                return res.status(200).json({ message: 'Matched', connectionId: existingConnection._id });
            }

            if (action === 'pass') {
                 // Even if they liked me, my pass overrides or sets to rejected
                 existingConnection.status = 'rejected';
                 await existingConnection.save();
            }

            return res.status(200).json({ message: 'Action registered on existing connection' });
        }

        // Connect does not exist, create it (ME sending to TARGET)
        const newConnection = new Connection({
            senderId: currentUser._id,
            receiverId: targetUserId,
            status: action === 'like' ? 'pending' : 'rejected' // pass -> rejected
        });
        await newConnection.save();

        res.status(200).json({ message: 'Action handled successfully' });
    } catch (error) {
        console.error('handleUserAction failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getConnections = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        if (!clerkId) return res.status(401).json({ message: 'Unauthorized' });

        const currentUser = await User.findOne({ clerkId });
        if (!currentUser) return res.status(404).json({ message: 'User not found' });

        const connections = await Connection.find({
            $or: [
                { senderId: currentUser._id },
                { receiverId: currentUser._id }
            ],
            status: { $in: ['pending', 'matched'] }
        }).populate('senderId', 'profile username _id')
          .populate('receiverId', 'profile username _id');

        const matches = [];
        const likes = [];
        const sent = [];

        connections.forEach(conn => {
            const isSender = conn.senderId._id.toString() === currentUser._id.toString();
            const targetUser = isSender ? conn.receiverId : conn.senderId;

            const mappedUser = {
                id: targetUser._id.toString(),
                name: targetUser.profile?.personalInfo?.name || targetUser.username || 'Unknown',
                age: targetUser.profile?.personalInfo?.age || 20,
                image: targetUser.profile?.avatarUrl || targetUser.profile?.photos?.find(p => p.isPrimary)?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=500&fit=crop',
                isOnline: false,
                lastActive: "Active today",
            };

            if (conn.status === 'matched') {
                matches.push(mappedUser);
            } else if (conn.status === 'pending') {
                if (isSender) {
                    sent.push({ status: 'sent', user: mappedUser, sentAt: conn.createdAt });
                } else {
                    likes.push({ ...mappedUser, likedAt: conn.createdAt });
                }
            }
        });

        res.status(200).json({ matches, likes, sent });
    } catch (error) {
         console.error('getConnections failed:', error);
         res.status(500).json({ message: 'Server error' });
    }
};
