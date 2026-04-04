const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const verifyToken = require('../middlewares/verifyTokenMiddleware');

// Tất cả các thao tác với giỏ hàng đều yêu cầu đăng nhập
router.get('/', verifyToken, cartController.getCart);
router.post('/add', verifyToken, cartController.addToCart);
router.put('/update', verifyToken, cartController.updateQuantity);
router.post('/remove', verifyToken, cartController.removeItem); // Dùng POST hoặc DELETE đều được, ở đây dùng POST kèm body cho dễ
// router.delete('/clear', verifyToken, cartController.clearCart);

module.exports = router;