const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadControlller');
const upload = require('../middlewares/uploadPicture');

router.post('/upload', upload.single('image'), uploadController.upload);

module.exports = router;