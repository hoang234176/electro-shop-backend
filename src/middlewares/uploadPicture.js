const multer = require('multer');
const cloudinary = require('../configs/cloudinary');

// Lấy toàn bộ thư viện ra để kiểm tra
const cloudinaryStorageLib = require('multer-storage-cloudinary');
console.log("👉 BÊN TRONG THƯ VIỆN CÓ GÌ:", cloudinaryStorageLib);

// Lấy CloudinaryStorage ra
const { CloudinaryStorage } = cloudinaryStorageLib;

// Bọc trong khối try...catch để server không bị sập nữa
let storage;
try {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'ElectroShop/images',
            allowedFormats: ['jpg', 'jpeg', 'png']
        }
    });
    console.log("✅ Khởi tạo Storage thành công!");
} catch (error) {
    console.error("❌ Lỗi khởi tạo:", error.message);
}

const uploadPicture = multer({ storage: storage });

module.exports = uploadPicture;