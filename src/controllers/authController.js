const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { userName, password } = req.body;

        // Tìm dữ liệu người dùng
        const user = await User.findOne({ username: userName});
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        } else {
            const isCheckPwd = await bcrypt.compare(password, user.password);
            if (!isCheckPwd) {
                return res.status(401).json({ message: 'Invalid credentials' });
            } else {
                const token = jwt.sign(
                    {user_id: user._id, username: user.username},
                    process.env.JWT_SECRET,
                    {
                        expiresIn: "2h"
                    }
                )
                return res.status(200).json({ token, role: user.role });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.register = async (req, res) => {
    try {
        const { fullName, userName, password, email, phone, address } = req.body;

        // Kiểm tra xem user đã tồn tại chưa (username, email hoặc phone)
        const existingUserName = await User.findOne({username: userName});
        if (existingUserName) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
        }
        const existingEmail = await User.findOne({email: email});
        if (existingEmail) {
            return res.status(400).json({ message: 'Email này đã tồn tại' });
        }
        const existingPhone = await User.findOne({phone: phone});
        if (existingPhone) {
            return res.status(400).json({ message: 'Số điện thoại này đã tồn tại' });
        }

        const newUser = new User({
            fullname: fullName, // Map từ biến fullName sang field fullname của Schema
            username: userName, // Map từ biến userName sang field username của Schema
            password, // Password sẽ được hash tự động bởi middleware pre-save trong User model
            email,
            phone,
            address
        });

        await newUser.save();
        res.status(201).json({ message: 'Đã đăng ký thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
