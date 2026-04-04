const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const verifyToken = require('../middlewares/verifyTokenMiddleware');

// @route   POST /api/reviews
// @desc    Tạo một review/comment mới
// @access  Private (Cần đăng nhập)
router.post('/', verifyToken, reviewController.createReview);

// @route   GET /api/reviews/:productId
// @desc    Lấy tất cả review của một sản phẩm
// @access  Public
router.get('/:productId', reviewController.getReviewsByProduct);

module.exports = router;