const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            family: 4, // Ép Node.js sử dụng IPv4, bỏ qua IPv6
        });
        console.log('Kết nối thành công đến MongoDB!!');
    } catch (error) {
        console.error(`Không thể kết nối đến MongoDB: ${error.message}`);
        process.exit(1); // Dừng server nếu không kết nối được
    }
};

module.exports = connectDB;