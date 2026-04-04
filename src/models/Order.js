const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        color: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    shippingInfo: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        note: { type: String }
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'vnpay'],
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'unpaid', 'paid', 'failed', 'paid_on_delivery', 'payment_failed', 'refunded', 'refund_failed'],
        default: 'pending' 
    },
    vnpayTransId: {
        type: String,
        default: null
    },
    vnpayPayDate: {
        type: String,
        default: null
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'shipping', 'delivered', 'cancelled'],
        default: 'pending'
    },
    cancelRequest: {
        type: Boolean,
        default: false
    },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);