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
    console.log(req.body);
}
