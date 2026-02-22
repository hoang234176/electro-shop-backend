const dotenv = require('dotenv');
// Cấu hình biến môi trường
dotenv.config();

const app = require('./src/app'); // Import file app.js
const connectDB = require('./src/configs/db');


const PORT = process.env.PORT || 5000;

// Kết nối cơ sở dữ liệu
connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
