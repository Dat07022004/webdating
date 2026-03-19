import { User } from '../models/user.model.js';
import cloudinary from '../config/cloudinary.js';

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

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
