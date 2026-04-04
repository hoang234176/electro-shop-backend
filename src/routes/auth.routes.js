const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Auth
router.post('/login', authController.login)
router.post('/register', authController.register)
router.post('/forgot-password', authController.forgotPasswordRequest)
router.post('/verify-reset-code', authController.verifyResetCode)
router.post('/reset-password', authController.verifyAndResetPassword)

module.exports = router;