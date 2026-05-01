const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middlewares/verifyTokenMiddleware');
const { infoFileUpload } = require('../controllers/uploadControlller');
const { uploadAvatar } = require('../middlewares/uploadPicture');

router.get('/info', verifyToken, userController.userInfo);
router.post(
    '/update', 
    verifyToken, 
    uploadAvatar.single('fileAvatar'), 
    userController.updateUser,
    infoFileUpload
)

router.put('/change-password', verifyToken, userController.changePassword)
router.put('/delete-account', verifyToken, userController.deleteAccount)

module.exports = router;