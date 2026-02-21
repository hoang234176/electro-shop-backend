const express = require('express');
const cors = require('cors');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Để đọc được dữ liệu JSON gửi lên từ Client

// Route chạy thử
app.get('/', (req, res) => {
    res.send('API e-commerce đang chạy...');
});

module.exports = app;