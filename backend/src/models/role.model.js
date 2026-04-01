import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['admin', 'manager', 'user'],
        unique: true
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);
