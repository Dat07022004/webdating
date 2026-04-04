import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    spotId: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'completed', 'cancelled'], 
        default: 'pending' 
    },
    note: { type: String, maxLength: 300 }
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
