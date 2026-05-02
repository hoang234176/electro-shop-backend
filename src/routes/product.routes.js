const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const verifyToken = require('../middlewares/verifyTokenMiddleware');
const verifyAdmin = require('../middlewares/verifyAdminMiddleware');
const { uploadProduct } = require('../middlewares/uploadPicture');

router.get('/', productController.getProducts);
router.get('/all', productController.getAllProducts);
router.get('/new', productController.getNewProducts);
router.get('/sale-top', productController.getTopSaleProducts);
router.get('/:id', productController.getProductById);

module.exports = router;