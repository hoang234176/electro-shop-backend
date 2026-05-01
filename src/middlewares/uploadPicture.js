const multer = require('multer');
const cloudinaryStorage = require('multer-storage-cloudinary');
require('../configs/cloudinary'); // Vẫn gọi để đảm bảo cloudinary đã được config bằng API Key
const cloudinaryRoot = require('cloudinary'); // Import gốc thư viện

// 1. Tạo một hàm nhận vào tên folder bạn muốn lưu
const createUploader = (folderName) => {
    const storage = cloudinaryStorage({
        cloudinary: cloudinaryRoot, // SỬA Ở ĐÂY: Truyền root thay vì v2
        folder: folderName, // Gán thư mục động dựa vào tham số truyền vào
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
    });

    return multer({ 
        storage: storage,
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