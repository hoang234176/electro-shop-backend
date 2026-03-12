// File: config/cloudinary.js
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Xuất (export) biến cloudinary đã được cấu hình ra ngoài để các file khác sử dụng
module.exports = cloudinary;