import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    image: {
        type: String,
        required: true
    }
})

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    clerkId: {
        type: String,
        required: true,
    },
    orderItems:[orderItemSchema],
    shippingAddress: {
        type: shippingAddressSchema,
        required
    },
    paymentResult: {
        id: String,
        status: String,
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ["pending","shipped,delivered"],
        default: "pending"
    },
    deliveredAt: {
        type: Date
    },
    shippedAt: {
        type: Date
    }
}, {timestamps:true});