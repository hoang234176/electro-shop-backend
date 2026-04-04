const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null // null hoặc 0 có nghĩa là người dùng chỉ bình luận, không đánh giá sao
    },
    comment: {
        type: String,
        required: [true, 'Nội dung bình luận không được để trống'],
        trim: true
    }
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;