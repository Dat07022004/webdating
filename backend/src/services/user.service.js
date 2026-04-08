import { User } from '../models/user.model.js';
import { Connection } from '../models/connection.model.js';
import { MatchSuggestion } from '../models/matchSuggestion.model.js';
import { Notification } from '../models/notification.model.js';
import { UserBlocked } from '../models/userBlocked.model.js';
import { getIO } from '../socket/index.js';
import { getSocketIds } from '../socket/onlineUsers.js';
import cloudinary from '../config/cloudinary.js';

const normalizeEmail = (value) => (value || '').trim().toLowerCase();
const MAX_PROFILE_PHOTOS = 6;
const MAX_INTERESTS = 20;

const badRequest = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

const buildDisplayName = (firstName, lastName) =>
    `${firstName || ''} ${lastName || ''}`.trim() || 'User';

const buildUsername = (email, clerkId) => {
    const usernameBase = (email.split('@')[0] || `user_${clerkId.slice(-6)}`).toLowerCase();
    const sanitizedUsername = usernameBase.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
    return `${sanitizedUsername}_${clerkId.slice(-6).toLowerCase()}`;
};

const buildOnboardingUpdateDoc = ({
    persistedEmail,
    imageUrl,
    photos,
    bio,
    displayName,
    age,
    hasValidBirthday,
    birthdayDate,
    gender,
    location,
    interests,
    lookingFor
}) => ({
    ...(Array.isArray(photos) && photos.length > 0
        ? {
            'profile.photos': photos,
            'profile.avatarUrl': photos.find((photo) => photo?.isPrimary)?.url || photos[0]?.url || imageUrl || ''
        }
        : imageUrl
            ? { 'profile.avatarUrl': imageUrl }
            : {}),
    email: persistedEmail,
    ...(bio !== undefined ? { 'profile.bio': bio } : {}),
    ...(displayName ? { 'profile.personalInfo.name': displayName } : {}),
    ...(age !== undefined ? { 'profile.personalInfo.age': age } : {}),
    ...(hasValidBirthday ? { 'profile.personalInfo.birthday': birthdayDate } : {}),
    ...(gender ? { 'profile.personalInfo.gender': gender } : {}),
    ...(location ? { 'profile.personalInfo.locationText': location } : {}),
    ...(Array.isArray(interests) ? { 'profile.interests': interests } : {}),
    ...(lookingFor ? { 'preferences.preferredGenders': [lookingFor] } : {})
});

const isDuplicateKeyError = (error) =>
    error?.code === 11000 || /E11000/i.test(error?.message || '');

const buildProfileCompletionPercent = (user) => {
    const checks = [
        !!user?.profile?.personalInfo?.name,
        Number.isFinite(user?.profile?.personalInfo?.age),
        !!user?.profile?.personalInfo?.gender,
        !!user?.profile?.personalInfo?.locationText,
        !!user?.profile?.bio,
        Array.isArray(user?.profile?.photos) && user.profile.photos.length >= 2,
        Array.isArray(user?.profile?.interests) && user.profile.interests.length > 0,
        !!user?.phone
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
};

const toProfileDto = (user) => {
    const profilePhotos = Array.isArray(user?.profile?.photos)
        ? user.profile.photos
            .filter((photo) => typeof photo?.url === 'string' && photo.url.trim())
            .map((photo) => ({
                url: photo.url,
                publicId: photo.publicId || '',
                isPrimary: photo.isPrimary === true
            }))
        : [];

    const photos = profilePhotos.length > 0
        ? profilePhotos
        : user?.profile?.avatarUrl
            ? [{
                url: user.profile.avatarUrl,
                publicId: '',
                isPrimary: true
            }]
            : [];

    return {
        id: user._id,
        email: user.email,
        phone: user.phone || '',
        username: user.username,
        role: user.role || 'user',
        name: user?.profile?.personalInfo?.name || user.username,
        age: Number.isFinite(user?.profile?.personalInfo?.age) ? user.profile.personalInfo.age : null,
        birthday: user?.profile?.personalInfo?.birthday || null,
        gender: user?.profile?.personalInfo?.gender || '',
        location: user?.profile?.personalInfo?.locationText || '',
        bio: user?.profile?.bio || '',
        interests: Array.isArray(user?.profile?.interests) ? user.profile.interests : [],
        photos,
        verified: {
            email: !!user.email,
            phone: !!user.phone,
            photo: photos.length > 0
        },
        completionPercent: buildProfileCompletionPercent(user)
    };
};

const findUserByIdentity = async ({ clerkId, email }) => {
    if (clerkId) {
        const byClerk = await User.findOne({ clerkId });
        if (byClerk) {
            return byClerk;
        }
    }

    const safeEmail = normalizeEmail(email);
    if (!safeEmail) {
        return null;
    }

    const byEmail = await User.findOne({ email: safeEmail });
    if (!byEmail) {
        return null;
    }

    if (clerkId && !byEmail.clerkId) {
        byEmail.clerkId = clerkId;
        await byEmail.save();
    }

    return byEmail;
};

const sanitizeProfilePhotos = (photos) => {
    if (!Array.isArray(photos)) {
        return undefined;
    }

    const cleaned = photos
        .filter((photo) => photo && typeof photo.url === 'string' && photo.url.trim())
        .map((photo, index) => ({
            url: photo.url.trim(),
            publicId: typeof photo.publicId === 'string' ? photo.publicId.trim() : '',
            isPrimary: photo.isPrimary === true,
            uploadedAt: photo.uploadedAt ? new Date(photo.uploadedAt) : new Date(),
            _index: index
        }));

    if (cleaned.length > MAX_PROFILE_PHOTOS) {
        throw badRequest(`Only ${MAX_PROFILE_PHOTOS} profile photos are allowed`);
    }

    const primaryIndex = cleaned.findIndex((photo) => photo.isPrimary === true);
    if (cleaned.length > 0) {
        const effectivePrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
        cleaned.forEach((photo, index) => {
            photo.isPrimary = index === effectivePrimaryIndex;
        });

        cleaned.sort((a, b) => {
            if (a.isPrimary === b.isPrimary) {
                return a._index - b._index;
            }

            return a.isPrimary ? -1 : 1;
        });
    }

    return cleaned.map(({ _index, ...photo }) => photo);
};

const sanitizeInterests = (interests) => {
    if (!Array.isArray(interests)) {
        return undefined;
    }

    const unique = Array.from(new Set(
        interests
            .filter((interest) => typeof interest === 'string')
            .map((interest) => interest.trim())
            .filter(Boolean)
    ));

    if (unique.length > MAX_INTERESTS) {
        throw badRequest(`Only ${MAX_INTERESTS} interests are allowed`);
    }

    return unique;
};

const sanitizePhone = (phone) => {
    if (phone === undefined) {
        return undefined;
    }

    if (typeof phone !== 'string') {
        throw badRequest('Phone number must be a string');
    }

    const cleaned = phone.trim().replace(/[\s().-]/g, '');
    if (!cleaned) {
        return '';
    }

    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
        throw badRequest('Phone number format is invalid');
    }

    return cleaned;
};

export const getUserProfile = async ({ clerkId, email }) => {
    const user = await findUserByIdentity({ clerkId, email });
    if (!user) {
        return null;
    }

    return toProfileDto(user);
};

export const updateUserProfile = async ({ clerkId, email, body }) => {
    const user = await findUserByIdentity({ clerkId, email });
    if (!user) {
        return null;
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const bio = typeof body?.bio === 'string' ? body.bio.trim() : undefined;
    const gender = typeof body?.gender === 'string' ? body.gender.trim() : undefined;
    const location = typeof body?.location === 'string' ? body.location.trim() : undefined;
    const interests = sanitizeInterests(body?.interests);
    const photos = sanitizeProfilePhotos(body?.photos);
    const phone = sanitizePhone(body?.phone);

    if (name !== undefined && name.length > 80) {
        throw badRequest('Name must be 80 characters or fewer');
    }

    if (bio !== undefined && bio.length > 500) {
        throw badRequest('Bio must be 500 characters or fewer');
    }

    if (location !== undefined && location.length > 120) {
        throw badRequest('Location must be 120 characters or fewer');
    }

    if (gender !== undefined && gender.length > 30) {
        throw badRequest('Gender must be 30 characters or fewer');
    }

    if (name !== undefined) {
        user.profile.personalInfo = user.profile.personalInfo || {};
        user.profile.personalInfo.name = name;
    }

    if (bio !== undefined) {
        user.profile.bio = bio;
    }

    if (gender !== undefined) {
        user.profile.personalInfo = user.profile.personalInfo || {};
        user.profile.personalInfo.gender = gender;
    }

    if (location !== undefined) {
        user.profile.personalInfo = user.profile.personalInfo || {};
        user.profile.personalInfo.locationText = location;
    }

    if (interests !== undefined) {
        user.profile.interests = interests;
    }

    if (photos !== undefined) {
        user.profile.photos = photos;
        user.profile.avatarUrl = photos[0]?.url || '';
    }

    if (phone !== undefined) {
        user.phone = phone || undefined;
    }

    if (body?.birthday !== undefined) {
        if (!body.birthday) {
            user.profile.personalInfo = user.profile.personalInfo || {};
            user.profile.personalInfo.birthday = undefined;
            user.profile.personalInfo.age = undefined;
        } else {
            const birthdayDate = new Date(body.birthday);
            if (Number.isNaN(birthdayDate.getTime())) {
                throw badRequest('Invalid birthday format');
            }

            if (birthdayDate > new Date()) {
                throw badRequest('Birthday cannot be in the future');
            }

            const age = Math.max(0, new Date().getFullYear() - birthdayDate.getFullYear());
            if (age < 18 || age > 100) {
                throw badRequest('Age must be between 18 and 100');
            }

            user.profile.personalInfo = user.profile.personalInfo || {};
            user.profile.personalInfo.birthday = birthdayDate;
            user.profile.personalInfo.age = age;
        }
    }

    try {
        await user.save();
    } catch (error) {
        if (isDuplicateKeyError(error) && (error?.message || '').includes('phone_1')) {
            throw badRequest('Phone number is already in use');
        }

        throw error;
    }

    return toProfileDto(user);
};

const tryRelinkByEmail = async ({ clerkId, safeEmail, updateDoc }) => {
    if (!safeEmail) {
        return false;
    }

    const existingByEmail = await User.findOne({ email: safeEmail }).select('_id clerkId');
    if (!existingByEmail) {
        return false;
    }

    const existingByClerkId = await User.findOne({ clerkId }).select('_id');
    if (existingByClerkId && String(existingByClerkId._id) !== String(existingByEmail._id)) {
        // Free unique clerkId before assigning it to the canonical email record.
        await User.updateOne({ _id: existingByClerkId._id }, { $unset: { clerkId: '' } });
    }

    await User.updateOne(
        { _id: existingByEmail._id },
        {
            $set: {
                clerkId,
                ...updateDoc
            }
        }
    );

    return true;
};

const uploadBufferToCloudinary = (buffer, options) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(result);
        });

        stream.end(buffer);
    });

export const uploadUserPhotosToCloudinary = async ({ files, clerkId }) => {
    if (!Array.isArray(files) || files.length === 0) {
        return [];
    }

    const uploadFolder = `webdating/users/${clerkId || 'anonymous'}`;
    const uploadResults = await Promise.all(
        files.map(async (file, index) => {
            const mimetype = (file?.mimetype || '').toLowerCase();
            if (!mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed');
            }

            const result = await uploadBufferToCloudinary(file.buffer, {
                folder: uploadFolder,
                resource_type: 'image',
                public_id: `${Date.now()}_${index}`,
                overwrite: false
            });

            return {
                url: result.secure_url,
                publicId: result.public_id,
                isPrimary: false,
                uploadedAt: new Date()
            };
        })
    );

    return uploadResults;
};

export const saveUserOnboarding = async ({ clerkId, auth, body }) => {
    const {
        email,
        firstName,
        lastName,
        imageUrl,
        photos,
        birthday,
        gender,
        lookingFor,
        location,
        interests,
        bio
    } = body || {};

    const normalizedPhotos = Array.isArray(photos)
        ? photos
            .filter((photo) => photo && typeof photo.url === 'string' && photo.url.trim())
            .map((photo, index) => ({
                url: photo.url.trim(),
                publicId: typeof photo.publicId === 'string' ? photo.publicId : '',
                isPrimary: photo.isPrimary === true || index === 0,
                uploadedAt: photo.uploadedAt ? new Date(photo.uploadedAt) : new Date()
            }))
        : [];

    const birthdayDate = birthday ? new Date(birthday) : null;
    const hasValidBirthday = !!birthdayDate && !Number.isNaN(birthdayDate.getTime());
    const age = hasValidBirthday
        ? Math.max(0, new Date().getFullYear() - birthdayDate.getFullYear())
        : undefined;

    const safeEmail = normalizeEmail(auth?.sessionClaims?.email || email);
    const displayName = buildDisplayName(firstName, lastName);
    const username = buildUsername(safeEmail, clerkId);
    const persistedEmail = safeEmail || `user_${clerkId.slice(-6)}@placeholder.local`;

    const updateDoc = buildOnboardingUpdateDoc({
        persistedEmail,
        imageUrl,
        photos: normalizedPhotos,
        bio,
        displayName,
        age,
        hasValidBirthday,
        birthdayDate,
        gender,
        location,
        interests,
        lookingFor
    });

    let byClerkId;
    try {
        byClerkId = await User.updateOne(
            { clerkId },
            { $set: updateDoc }
        );
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const relinked = await tryRelinkByEmail({ clerkId, safeEmail, updateDoc });
            if (relinked) {
                return;
            }
        }

        throw error;
    }

    if (byClerkId.matchedCount > 0) {
        return;
    }

    if (safeEmail) {
        let byEmail;
        try {
            byEmail = await User.updateOne(
                { email: safeEmail },
                {
                    $set: {
                        clerkId,
                        ...updateDoc
                    }
                }
            );
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                const relinked = await tryRelinkByEmail({ clerkId, safeEmail, updateDoc });
                if (relinked) {
                    return;
                }
            }

            throw error;
        }

        if (byEmail.matchedCount > 0) {
            return;
        }
    }

    try {
        await User.create({
            clerkId,
            email: persistedEmail,
            username,
            passwordHash: `clerk_${clerkId}`,
            ...(imageUrl ? { profile: { avatarUrl: imageUrl, personalInfo: { name: displayName } } } : {
                profile: { personalInfo: { name: displayName } }
            })
        });

        await User.updateOne({ clerkId }, { $set: updateDoc });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const relinked = await tryRelinkByEmail({ clerkId, safeEmail, updateDoc });
            if (relinked) {
                return;
            }

            await User.updateOne({ clerkId }, { $set: updateDoc });
            return;
        }

        throw error;
    }
};

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const getDiscoverUsers = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const existingConnections = await Connection.find({
        $or: [
            { senderId: currentUser._id },
            { receiverId: currentUser._id }
        ]
    });

    const blockedRecords = await UserBlocked.find({
        $or: [
            { blockerId: currentUser._id },
            { blockedId: currentUser._id }
        ]
    });

    const excludedIdSet = new Set([currentUser._id.toString()]);
    existingConnections.forEach((conn) => {
        if (conn.senderId) {
            excludedIdSet.add(conn.senderId.toString());
        }
        if (conn.receiverId) {
            excludedIdSet.add(conn.receiverId.toString());
        }
    });

    blockedRecords.forEach((record) => {
        if (record.blockerId) {
            excludedIdSet.add(record.blockerId.toString());
        }
        if (record.blockedId) {
            excludedIdSet.add(record.blockedId.toString());
        }
    });
    const excludedIds = Array.from(excludedIdSet);

    const suggestions = await MatchSuggestion.find({ userId: currentUser._id }).populate(
       'candidateUserId',
       '_id profile username status'
    );

    let candidates = suggestions
        .filter(s => s.candidateUserId && !excludedIdSet.has(s.candidateUserId._id.toString()))
        .map(s => s.candidateUserId);

    if (candidates.length === 0) {
        candidates = await User.find({
            _id: { $nin: excludedIds }
        }).limit(20).select('_id profile username status');
        
        if (candidates.length > 0) {
             const suggestionDocs = candidates.map(c => ({
                 userId: currentUser._id,
                 candidateUserId: c._id,
                 score: 0.8
             }));
             try {
                 await MatchSuggestion.insertMany(suggestionDocs);
             } catch (insertError) {
                 console.warn('Failed to insert MatchSuggestion records:', insertError.message);
             }
        }
    }

    const mappedUsers = candidates
        .filter(user => user && user._id)
        .map(user => ({
            id: user._id.toString(),
            name: user.profile?.personalInfo?.name || user.username || 'Unknown',
            age: user.profile?.personalInfo?.age || 21,
            location: user.profile?.personalInfo?.locationText || 'Unknown location',
            bio: user.profile?.bio || 'No bio yet.',
            image: user.profile?.avatarUrl || user.profile?.photos?.find(p => p.isPrimary)?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop',
            interests: user.profile?.interests || [],
            verified: true,
            distance: 'Just now'
        }));

    return { users: mappedUsers };
};

export const handleUserAction = async ({ clerkId, targetUserId, action }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    if (!targetUserId || !['like', 'pass'].includes(action)) {
        throw createError(400, 'Invalid payload');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const existingConnection = await Connection.findOne({
        $or: [
            { senderId: currentUser._id, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: currentUser._id }
        ]
    });

    if (existingConnection) {
        const isTargetTheSender = existingConnection.senderId.toString() === targetUserId;

        if (isTargetTheSender && existingConnection.status === 'pending' && action === 'like') {
            existingConnection.status = 'matched';
            await existingConnection.save();

            // Notify both users about the match
            try {
                const io = getIO();
                const targetUser = await User.findById(targetUserId).select('profile.personalInfo.name username profile.avatarUrl');
                const senderName = currentUser.profile?.personalInfo?.name || currentUser.username || 'Ai đó';
                const targetName = targetUser?.profile?.personalInfo?.name || targetUser?.username || 'Ai đó';

                await Notification.create([
                    {
                        userId: currentUser._id,
                        senderId: targetUserId,
                        type: 'match',
                        title: 'New Match!',
                        message: `Bạn và ${targetName} đã tương hợp! Bắt đầu trò chuyện ngay.`,
                        image: targetUser?.profile?.avatarUrl,
                        metadata: { connectionId: existingConnection._id }
                    },
                    {
                        userId: targetUserId,
                        senderId: currentUser._id,
                        type: 'match',
                        title: 'New Match!',
                        message: `Bạn and ${senderName} đã tương hợp! Bắt đầu trò chuyện ngay.`,
                        image: currentUser.profile?.avatarUrl,
                        metadata: { connectionId: existingConnection._id }
                    }
                ]);

                const senderSockets = getSocketIds(currentUser._id.toString());
                const receiverSockets = getSocketIds(targetUserId);
                
                [...senderSockets, ...receiverSockets].forEach(sid => io.to(sid).emit('new_notification', { type: 'match' }));

                senderSockets.forEach(sid => io.to(sid).emit('new_match', { matchWith: targetName, connectionId: existingConnection._id, userId: targetUserId }));
                receiverSockets.forEach(sid => io.to(sid).emit('new_match', { matchWith: senderName, connectionId: existingConnection._id, userId: currentUser._id.toString() }));
            } catch (socketError) {
                console.error('[Socket] Match notification failed:', socketError.message);
            }

            return { message: 'Matched', connectionId: existingConnection._id };
        }

        if (action === 'pass') {
             existingConnection.status = 'rejected';
             await existingConnection.save();
        }

        return { message: 'Action registered' };
    }

    const newConnection = new Connection({
        senderId: currentUser._id,
        receiverId: targetUserId,
        status: action === 'like' ? 'pending' : 'rejected'
    });
    await newConnection.save();

    // Notify target of anonymous like
    if (action === 'like') {
        try {
            await Notification.create({
                userId: targetUserId,
                senderId: currentUser._id,
                type: 'like',
                title: 'Someone Likes You!',
                message: 'Ai đó đã thích hồ sơ của bạn. Nâng cấp để xem là ai!',
                image: null
            });

            const io = getIO();
            const receiverSockets = getSocketIds(targetUserId);
            receiverSockets.forEach(sid => io.to(sid).emit('new_notification', { type: 'like' }));
        } catch (err) {
            console.error('[Notification] Like notification failed:', err.message);
        }
    }

    return { message: 'Action handled' };
};

export const getConnections = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

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
        const sender = conn.senderId;
        const receiver = conn.receiverId;

        // Skip orphaned connections where related users are missing to avoid runtime 500s.
        if (!sender?._id || !receiver?._id) {
            return;
        }

        const isSender = sender._id.toString() === currentUser._id.toString();
        const targetUser = isSender ? receiver : sender;

        const mappedUser = {
            id: targetUser?._id?.toString() || 'unknown',
            name: targetUser?.profile?.personalInfo?.name || targetUser?.username || 'Unknown',
            age: targetUser?.profile?.personalInfo?.age || 20,
            image: targetUser?.profile?.avatarUrl || targetUser?.profile?.photos?.find(p => p.isPrimary)?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=500&fit=crop',
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

    return { matches, likes, sent };
};
