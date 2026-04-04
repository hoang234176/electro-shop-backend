const mongoose = require('mongoose');

/**
 * Schema cho từng phiên bản (màu sắc) của sản phẩm.
 * Đây là một sub-document, sẽ được nhúng vào trong Product.
 */
const variantSchema = new mongoose.Schema({
    color: {
        type: String,
        required: [true, 'Màu sắc của phiên bản không được để trống'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Số lượng tồn kho của phiên bản không được để trống'],
        min: [0, 'Số lượng không thể là số âm'],
        default: 0
    },
    image: {
        type: String, // URL hình ảnh cho phiên bản màu này
        trim: true
    },
    sold: {
        type: Number,
        default: 0,
        min: [0, 'Số lượng bán không thể là số âm']
    }
}, { _id: false }); // _id: false để không tự tạo _id cho mỗi variant

/**
 * Schema chính cho Product.
 */
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên sản phẩm không được để trống'],
        trim: true
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand', // Tham chiếu tới model 'Brand'
        required: [true, 'Thương hiệu không được để trống']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Tham chiếu tới model 'Category'
        required: [true, 'Danh mục không được để trống']
    },
    importPrice: {
        type: Number,
        required: [true, 'Giá nhập không được để trống']
    },
    price: {
        type: Number,
        required: [true, 'Giá bán không được để trống']
    },
    sold: {
        type: Number,
        default: 0,
        min: [0, 'Số lượng bán không thể là số âm']
    },
    rating: {
        type: Number,
        default: 0 // Điểm đánh giá trung bình (ví dụ: 4.5)
    },
    reviewCount: {
        type: Number,
        default: 0 // Tổng số lượt đánh giá có tính sao
    },
    ratingBreakdown: {
        star1: { type: Number, default: 0 },
        star2: { type: Number, default: 0 },
        star3: { type: Number, default: 0 },
        star4: { type: Number, default: 0 },
        star5: { type: Number, default: 0 }
    },
    variants: [variantSchema],
    description: {
        type: String,
        trim: true
    },
    specifications: {
        type: Map,
        of: String // Cấu trúc key-value linh hoạt, ví dụ: { "screen": "OLED 5.8 inch", "cpu": "Apple A11" }
    }
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    toJSON: { virtuals: true }, // Đảm bảo các trường ảo được include khi chuyển sang JSON
    toObject: { virtuals: true }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;