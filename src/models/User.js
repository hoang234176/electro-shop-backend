const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Cần cài đặt: npm install bcryptjs

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'https://res.cloudinary.com/dygh4jakc/image/upload/v1774000774/avatar_default.jpg'
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'], // Chỉ cho phép 2 giá trị này
        default: 'USER'          // Mặc định ai đăng ký cũng là user thường
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {
    timestamps: true // Tự động thêm createdAt và updatedAt
});

// Middleware: Tự động mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function() {
    // Nếu mật khẩu không bị thay đổi (ví dụ chỉ update tên), thì bỏ qua bước này
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method: Kiểm tra mật khẩu khi đăng nhập (sẽ dùng sau này ở Controller)
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);