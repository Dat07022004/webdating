import mongoose from 'mongoose';

const geoPointSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: (value) => Array.isArray(value) && value.length === 2,
            message: 'Geo coordinates must be [longitude, latitude]'
        }
    }
}, { _id: false });

const profilePhotoSchema = new mongoose.Schema({
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
    clerkId: { type: String, unique: true, sparse: true, index: true },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'user'],
        default: 'user'
    },
    isVerified: { type: Boolean, default: false },
    profile: {
        avatarUrl: { type: String, default: '' },
        photos: {
            type: [profilePhotoSchema],
            default: []
        },
        bio: { type: String, default: '' },
        personalInfo: {
            name: String,
            birthday: Date,
            age: Number,
            gender: String,
            locationText: String,
            location: {
                type: geoPointSchema,
                default: undefined
            },
            region: String
        },
        interests: [String]
    },
    preferences: {
        ageRange: {
            min: { type: Number, default: 18 },
            max: { type: Number, default: 99 }
        },
        preferredGenders: [String],
        preferredRegions: [String],
        maxDistanceKm: { type: Number, default: 30 },
        preferredInterests: [String],
        relationshipGoal: String,
        budgetRange: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 0 }
        }
    },
    behaviorSignals: {
        likesGiven: { type: Number, default: 0 },
        likesReceived: { type: Number, default: 0 },
        profileViews: { type: Number, default: 0 },
        reputationScore: { type: Number, default: 100 },
        photoAccuracy: { type: Number, default: 100 }, // Percentage 0-100
        activeHours: [Number],
        recentActions: [{
            actionType: {
                type: String,
                enum: ['view', 'like', 'pass', 'match', 'message', 'appointment']
            },
            targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    settings: {
        notificationPref: { type: Boolean, default: true },
        privacyPref: { type: Boolean, default: true },
        allowVideoCall: { type: Boolean, default: true },
        allowGeoDiscovery: { type: Boolean, default: true }
    },
    premiumPlan: {
        type: {
            type: String,
            enum: ['none', 'gold', 'platinum'],
            default: 'none'
        },
        expiresAt: { type: Date, default: null }
    },
    status: {
        online: { type: Boolean, default: false },
        lastSeen: { type: Date, default: Date.now }
    }
}, { timestamps: true });

userSchema.index({ 'profile.personalInfo.location': '2dsphere' });
userSchema.index({ 'profile.personalInfo.age': 1, 'profile.personalInfo.gender': 1, 'profile.personalInfo.region': 1 });
userSchema.index({ 'profile.interests': 1 });

export const User = mongoose.model('User', userSchema);