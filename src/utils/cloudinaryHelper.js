// Hàm trích xuất public_id từ URL Cloudinary
const getPublicIdFromUrl = (url) => {
    try {
        // Kiểm tra xem url có hợp lệ không
        if (!url || typeof url !== 'string') {
            return null;
        }

        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;

        let startIndex = uploadIndex + 1;
        // Bỏ qua phần version (ví dụ: v1774000774) nếu có trên đường dẫn
        if (parts[startIndex].match(/^v\d+$/)) {
            startIndex++;
        }

        const publicIdWithExtension = parts.slice(startIndex).join('/');
        const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
        
        // Nếu không tìm thấy dấu chấm, toàn bộ chuỗi là public_id (trường hợp không có extension)
        return lastDotIndex !== -1 ? publicIdWithExtension.substring(0, lastDotIndex) : publicIdWithExtension;
    } catch (error) {
        console.error("Lỗi trích xuất publicId:", error);
        return null;
    }
};

module.exports = {
    getPublicIdFromUrl
};