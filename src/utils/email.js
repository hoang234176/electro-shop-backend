const nodemailer = require('nodemailer');

/**
 * @description Gửi email bằng nodemailer
 * @param {object} options - Các tùy chọn cho email (to, subject, message)
 */
const sendEmail = async (options) => {
    // 1. Tạo transporter (dịch vụ sẽ gửi email, ví dụ: Gmail, Mailtrap)
    // Cấu hình này được đọc từ file .env
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // 2. Định nghĩa các tùy chọn cho email
    const mailOptions = {
        from: 'ElectroShop <noreply@electroshop.com>',
        to: options.email,
        subject: options.subject,
        html: options.message, // Thay đổi từ text sang html để gửi email có định dạng
    };

    // 3. Gửi email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;