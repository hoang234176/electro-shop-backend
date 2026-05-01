const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middlewares/verifyTokenMiddleware');
const verifyAdmin = require('../middlewares/verifyAdminMiddleware');
const { uploadProduct } = require('../middlewares/uploadPicture')

// Admin

router.get('/users', verifyToken, verifyAdmin, adminController.userManager);
router.delete('/users/:id', verifyToken, verifyAdmin, adminController.deleteUser);
router.post('/addProduct', verifyToken, verifyAdmin, uploadProduct.array('variant_images', 20), adminController.addProducts)
router.get('/products/all', verifyToken, verifyAdmin, adminController.getAllProductsDashBoard);
router.delete('/products/:id', verifyToken, verifyAdmin, adminController.deleteProduct);
router.put('/products/:id', verifyToken, verifyAdmin, uploadProduct.array('variant_images', 20), adminController.editProduct); 
router.put('/products/:id/import', verifyToken, verifyAdmin, uploadProduct.array('variant_images', 20), adminController.importProduct);

router.get('/orders/all', verifyToken, adminController.getAllOrders);
router.put('/orders/:id/status', verifyToken, adminController.updateOrderStatus);

module.exports = router;