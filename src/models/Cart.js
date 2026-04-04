const mongoose = require('mongoose');

/**
 * Schema cho từng sản phẩm bên trong giỏ hàng
 */
const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Sản phẩm không được để trống']
    },
    color: {
        type: String,
        required: [true, 'Màu sắc (phiên bản) không được để trống']
    },
    quantity: {
        type: Number,
        required: [true, 'Số lượng không được để trống'],
        min: [1, 'Số lượng phải lớn hơn hoặc bằng 1'],
        default: 1
    }
}, { _id: false }); // Không cần tạo _id riêng cho mỗi item trong mảng để dữ liệu nhẹ hơn

/**
 * Schema chính cho Giỏ hàng
 */
const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Đảm bảo mỗi người dùng chỉ có đúng 1 giỏ hàng duy nhất
    },
    items: [cartItemSchema]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;