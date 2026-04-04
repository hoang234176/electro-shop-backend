const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/email');

exports.login = async (req, res) => {
    try {
        console.log(req.body)
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
                    {
                        user_id: user._id,
                        role: user.role,
                    },
                    process.env.JWT_SECRET,
                    // {
                    //     expiresIn: "2h"
                    // }
                )
                const avatar = user.avatar;
                return res.status(200).json({ token, avatar });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.forgotPasswordRequest = async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            // Trả về 200 để tránh lộ thông tin user nào tồn tại, đây là một good practice về bảo mật
            return res.status(200).json({ message: 'Nếu tên đăng nhập tồn tại trong hệ thống, một email hướng dẫn sẽ được gửi đến bạn.' });
        }

        // 1. Tạo mã khôi phục ngẫu nhiên 6 chữ số
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Lưu mã và thời gian hết hạn vào user
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 phút
        await user.save();

        // 3. Gửi mã đến email của người dùng
        try {
            await sendEmail({
                email: user.email,
                subject: 'Mã khôi phục mật khẩu ElectroShop',
                message: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Khôi phục mật khẩu ElectroShop</h2>
                        <p>Chào ${user.fullname},</p>
                        <p>Bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
                        <p>Vui lòng sử dụng mã xác thực dưới đây để hoàn tất quá trình. Mã này có hiệu lực trong 10 phút.</p>
                        <p style="background: #f2f2f2; padding: 10px; border-radius: 5px; font-size: 20px; text-align: center; letter-spacing: 5px;">
                            <strong>${resetCode}</strong>
                        </p>
                        <p>Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
                        <hr>
                        <p>Trân trọng,<br>Đội ngũ ElectroShop</p>
                    </div>
                `
            });

            // 4. Che email để gửi về cho frontend
            const [emailUser, emailDomain] = user.email.split('@');
            const maskedEmail = `${emailUser.substring(0, 2)}*****${emailUser.substring(emailUser.length - 2)}@${emailDomain}`;

            res.status(200).json({ message: 'Mã khôi phục đã được gửi.', maskedEmail });

        } catch (error) {
            console.error("Lỗi gửi email:", error);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Lỗi khi gửi email. Vui lòng thử lại.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
};

exports.verifyResetCode = async (req, res) => {
    try {
        const { username, code } = req.body;

        const user = await User.findOne({
            username,
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Mã không hợp lệ hoặc đã hết hạn.' });
        }

        // Chỉ kiểm tra hợp lệ, không xoá mã token cho đến khi password mới được đặt
        res.status(200).json({ message: 'Mã xác thực hợp lệ.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
};

exports.verifyAndResetPassword = async (req, res) => {
    try {
        const { username, code, password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu.' });
        }

        const hasValidLength = password.length >= 8 && password.length <= 24;
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasValidLength || !hasUppercase || !hasNumber || !hasSpecialChar) {
            return res.status(400).json({ message: 'Mật khẩu không đáp ứng các yêu cầu bảo mật.' });
        }

        const user = await User.findOne({
            username,
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Mã không hợp lệ hoặc đã hết hạn.' });
        }

        // Cập nhật mật khẩu mới (hook 'pre-save' trong User model sẽ tự động hash)
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi máy chủ khi đặt lại mật khẩu.' });
    }
};

exports.register = async (req, res) => {
    try {
        const { fullName, userName, password, email, phone, address } = req.body;

        // Tối ưu: Kiểm tra username, email, và phone đã tồn tại hay chưa chỉ bằng MỘT lần gọi DB
        const existingUser = await User.findOne({
            $or: [
                { username: userName },
                { email: email },
                { phone: phone }
            ]
        });

        if (existingUser) {
            if (existingUser.username === userName) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
            if (existingUser.email === email) return res.status(400).json({ message: 'Email này đã tồn tại' });
            if (existingUser.phone === phone) return res.status(400).json({ message: 'Số điện thoại này đã tồn tại' });
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
