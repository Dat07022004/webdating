const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema({
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: (value) => Array.isArray(value) && value.length === 2,
            message: "Geo coordinates must be [longitude, latitude]"
        }
    }
}, { _id: false });

// User Schema
const userSchema = new mongoose.Schema({
    clerkId: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    profile: {
        avatarUrl: { type: String, default: "" },
        bio: { type: String, default: "" },
        personalInfo: {
            name: String,
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
        activeHours: [Number],
        recentActions: [{
            actionType: {
                type: String,
                enum: ["view", "like", "pass", "match", "message", "appointment"]
            },
            targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    settings: {
        notificationPref: { type: Boolean, default: true },
        privacyPref: { type: Boolean, default: true },
        allowVideoCall: { type: Boolean, default: true },
        allowGeoDiscovery: { type: Boolean, default: true }
    },
    status: {
        online: { type: Boolean, default: false },
        lastSeen: { type: Date, default: Date.now }
    }
}, { timestamps: true });

userSchema.index({ "profile.personalInfo.location": "2dsphere" });
userSchema.index({ "profile.personalInfo.age": 1, "profile.personalInfo.gender": 1, "profile.personalInfo.region": 1 });
userSchema.index({ "profile.interests": 1 });


// Connection Schema
const connectionSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    interactionType: {
        type: String,
        enum: ["like", "friend_request", "match_invite"],
        default: "like"
    },
    status: {
        type: String,
        enum: ["pending", "liked", "matched", "accepted", "rejected", "blocked", "canceled"],
        default: "pending" },
    matchedBy: {
        type: String,
        enum: ["manual", "geo", "interest", "behavior", "hybrid"],
        default: "manual"
    },
    matchedScore: { type: Number, min: 0, max: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

connectionSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
connectionSchema.index({ receiverId: 1, status: 1, createdAt: -1 });


// Chat Schema
const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: Date.now },
    messages: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: String,
        type: { type: String, enum: ["text", "image", "emoji"], default: "text" },
        media: [{
            mediaType: { type: String, enum: ["image", "video", "audio", "file", "sticker"] },
            url: String,
            meta: {
                width: Number,
                height: Number,
                size: Number
            }
        }],
        deliveryStatus: {
            type: String,
            enum: ["sending", "sent", "delivered", "read"],
            default: "sent"
        },
        timestamp: { type: Date, default: Date.now },
        readAt: Date
    }]
}, { timestamps: true });

chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });


// Video Call Schema
const videoCallSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
        type: String,
        enum: ["ringing", "accepted", "rejected", "missed", "ended", "failed"],
        default: "ringing"
    },
    startedAt: Date,
    endedAt: Date,
    durationSeconds: { type: Number, default: 0 },
    signalingChannel: String
}, { timestamps: true });

videoCallSchema.index({ callerId: 1, receiverId: 1, createdAt: -1 });


// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "Date Appointment" },
    location: {
        placeName: String,
        address: String,
        geo: {
            type: geoPointSchema,
            default: undefined
        }
    },
    suggestedTimeSlots: [{
        startTime: Date,
        endTime: Date
    }],
    scheduledTime: Date,
    estimatedCost: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        currency: { type: String, default: "VND" }
    },
    status: { type: String, enum: ["proposed", "scheduled", "completed", "canceled", "rescheduled"], 
        default: "scheduled" },
    suggestionSource: {
        type: String,
        enum: ["manual", "system_recommendation"],
        default: "manual"
    },
    feedbacks: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

appointmentSchema.index({ creatorId: 1, participantId: 1, scheduledTime: 1 });
appointmentSchema.index({ scheduledTime: 1, status: 1 });


// Notification Schema
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: [
        "new_message",
        "new_match",
        "upcoming_appointment",
        "connection_liked",
        "connection_request",
        "appointment_updated",
        "video_call_incoming",
        "system"
    ] },
    content: String,
    data: mongoose.Schema.Types.Mixed,
    channel: { type: String, enum: ["in_app", "push", "email"], default: "in_app" },
    isRealtime: { type: Boolean, default: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });


// Report Schema=
const reportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reasonCategory: {
        type: String,
        enum: ["spam", "harassment", "fake_profile", "scam", "inappropriate_content", "other"],
        required: true
    },
    reason: String,
    evidenceUrls: [String],
    isUrgent: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "reviewed", "resolved"], 
        default: "pending" },
    createdAt: { type: Date, default: Date.now }
});


// Blocked User Schema
const blockSchema = new mongoose.Schema({
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: String,
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

blockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });


// Match Suggestion Schema
const matchSuggestionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidateUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, min: 0, max: 1, required: true },
    reasonTags: [{
        type: String,
        enum: ["same_interest", "nearby", "similar_behavior", "mutual_connection", "profile_similarity"]
    }],
    generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

matchSuggestionSchema.index({ userId: 1, score: -1, generatedAt: -1 });


// Export Models
const User = mongoose.model("User", userSchema);
const Connection = mongoose.model("Connection", connectionSchema);
const Chat = mongoose.model("Chat", chatSchema);
const VideoCall = mongoose.model("VideoCall", videoCallSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const Report = mongoose.model("Report", reportSchema);
const Block = mongoose.model("Block", blockSchema);
const MatchSuggestion = mongoose.model("MatchSuggestion", matchSuggestionSchema);

module.exports = {
    User,
    Connection,
    Chat,
    VideoCall,
    Appointment,
    Notification,
    Report,
    Block,
    MatchSuggestion
};