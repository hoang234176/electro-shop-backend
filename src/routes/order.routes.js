const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken  = require('../middlewares/verifyTokenMiddleware'); // Import middleware kiểm tra đăng nhập của bạn

// Route POST /api/orders
router.post('/', verifyToken, orderController.createOrder);
router.get('/my-orders', verifyToken, orderController.getUserOrders);
router.put('/:id/cancel', verifyToken, orderController.cancelOrder);
router.get('/vnpay_ipn', orderController.handleVNPayIPN); // Route cho VNPay IPN (Public)
router.get('/vnpay_return', orderController.vnpayReturn);

module.exports = router;