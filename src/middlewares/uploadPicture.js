const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../configs/cloudinary');

// 1. Tạo một hàm nhận vào tên folder bạn muốn lưu
const createUploader = (folderName) => {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: folderName, // Gán thư mục động dựa vào tham số truyền vào
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        }
    });

    return multer({ 
        storage: storage,
        // limits: { fileSize: 5 * 1024 * 1024 }
    });
};

// 2. Khởi tạo các middleware riêng biệt cho từng loại ảnh
const uploadAvatar = createUploader('ElectroShop/avatar');
const uploadProduct = createUploader('ElectroShop/products');

// 3. Export chúng ra để sử dụng ở Router
module.exports = {
    uploadAvatar,
    uploadProduct
};