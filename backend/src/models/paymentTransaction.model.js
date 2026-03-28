import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    plan: { type: String, enum: ['gold', 'platinum'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    transactionId: { type: String, default: '' },
    payUrl: { type: String, default: '' }
}, { timestamps: true });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
