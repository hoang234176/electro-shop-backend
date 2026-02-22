const express = require('express');
const cors = require('cors');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    try {
        const users = await User.find(); // Lấy tất cả user từ DB
        res.json(users); // Trả về dưới dạng JSON
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = app;
