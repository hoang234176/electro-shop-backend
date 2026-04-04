const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');

/**
 * @description Tạo một đánh giá hoặc bình luận mới cho sản phẩm
 * @route POST /api/reviews
 * @access Private
 */
exports.createReview = async (req, res) => {
    const { productId, rating, comment } = req.body;
    const userId = req.user.user_id; // Lấy từ middleware verifyToken

    if (!comment || !comment.trim()) {
        return res.status(400).json({ message: 'Nội dung bình luận không được để trống.' });
    }

    try {
        // 1. Nếu người dùng gửi kèm rating (đánh giá sao)
        if (rating && (rating >= 1 && rating <= 5)) {
            // Kiểm tra xem user này đã từng đánh giá CÓ SAO cho sản phẩm này chưa
            const existingRating = await Review.findOne({
                product: productId,
                user: userId,
                rating: { $ne: null, $gt: 0 } // Tìm bản ghi có rating khác null và > 0
            });

            if (existingRating) {
                return res.status(400).json({
                    message: 'Bạn đã đánh giá sao cho sản phẩm này rồi. Bạn chỉ có thể bình luận thêm.'
                });
            }
        }

        // 2. Tạo và lưu review mới
        const newReview = new Review({
            product: productId,
            user: userId,
            rating: rating || null, // Nếu không có rating thì lưu là null
            comment: comment
        });
        await newReview.save();

        // 3. Nếu là một đánh giá có sao, cập nhật lại thống kê cho Product
        if (rating && (rating >= 1 && rating <= 5)) {
            // Dùng Aggregation Pipeline để tính toán lại tất cả các thông số
            const stats = await Review.aggregate([
                {
                    $match: {
                        product: new mongoose.Types.ObjectId(productId),
                        rating: { $ne: null, $gt: 0 } // Chỉ tính các review có sao
                    }
                },
                {
                    $group: {
                        _id: '$product',
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 },
                        // Đếm số lượng cho mỗi mức sao
                        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
                    }
                }
            ]);

            if (stats.length > 0) {
                const { averageRating, totalReviews, star1, star2, star3, star4, star5 } = stats[0];
                await Product.findByIdAndUpdate(productId, {
                    rating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
                    reviewCount: totalReviews,
                    ratingBreakdown: { star1, star2, star3, star4, star5 }
                });
            }
        }

        // Populate thông tin user cho review vừa tạo để trả về client
        const populatedReview = await Review.findById(newReview._id).populate('user', 'fullname avatar');

        res.status(201).json({ message: 'Đã gửi nhận xét thành công!', review: populatedReview });

    } catch (error) {
        console.error("Lỗi khi tạo review:", error);
        res.status(500).json({ message: 'Lỗi máy chủ khi tạo nhận xét.' });
    }
};

/**
 * @description Lấy tất cả review của một sản phẩm
 * @route GET /api/reviews/:productId
 * @access Public
 */
exports.getReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.find({ product: productId })
            .populate('user', 'fullname avatar') // Lấy tên và avatar của người dùng
            .sort({ createdAt: -1 }); // Sắp xếp mới nhất lên đầu

        if (!reviews) {
            return res.status(200).json([]); // Trả về mảng rỗng nếu không có review
        }

        res.status(200).json(reviews);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách review:", error);
        res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách nhận xét.' });
    }
};