const Cart = require('../models/Cart');
const Product = require('../models/Product');

/**
 * Lấy thông tin giỏ hàng của user hiện tại
 */
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.user_id;
        let cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product',
            select: 'name price variants' // Chỉ lấy các trường cần thiết để hiển thị trong giỏ
        });

        // Nếu user chưa có giỏ hàng, tạo một giỏ hàng rỗng
        if (!cart) {
            cart = await Cart.create({ user: userId, items: [] });
        }
        
        res.status(200).json(cart);
    } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy giỏ hàng' });
    }
};

/**
 * Thêm sản phẩm vào giỏ hàng
 */
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { productId, color, quantity } = req.body;

        if (!productId || !color || !quantity) {
            return res.status(400).json({ message: 'Thiếu thông tin sản phẩm (ID, màu sắc, số lượng)' });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        // Kiểm tra xem sản phẩm (với cùng màu sắc) đã có trong giỏ chưa
        const itemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && item.color === color
        );

        if (itemIndex > -1) {
            // Nếu có rồi, cộng dồn số lượng
            cart.items[itemIndex].quantity += quantity;
        } else {
            // Nếu chưa có, thêm mới vào mảng items
            cart.items.push({ product: productId, color, quantity });
        }

        await cart.save();
        await cart.populate('items.product', 'name price variants');

        res.status(200).json({ message: 'Đã thêm sản phẩm vào giỏ hàng', cart });
    } catch (error) {
        console.error("Lỗi thêm vào giỏ:", error);
        res.status(500).json({ message: 'Lỗi server khi thêm vào giỏ hàng' });
    }
};

/**
 * Cập nhật số lượng của một sản phẩm trong giỏ
 */
exports.updateQuantity = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { productId, color, quantity } = req.body;

        const cart = await Cart.findOneAndUpdate(
            { user: userId, "items.product": productId, "items.color": color },
            { $set: { "items.$.quantity": quantity } }, // Cập nhật đúng phần tử trong mảng
            { new: true }
        ).populate('items.product', 'name price variants');

        if (!cart) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
        }

        res.status(200).json({ message: 'Cập nhật số lượng thành công', cart });
    } catch (error) {
        console.error("Lỗi cập nhật số lượng:", error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật giỏ hàng' });
    }
};

/**
 * Xóa một sản phẩm khỏi giỏ hàng
 */
exports.removeItem = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { productId, color } = req.body; // Gửi productId và color muốn xóa

        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId, color: color } } }, // Loại bỏ phần tử khỏi mảng
            { new: true }
        ).populate('items.product', 'name price variants');

        res.status(200).json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng', cart });
    } catch (error) {
        console.error("Lỗi xóa sản phẩm khỏi giỏ:", error);
        res.status(500).json({ message: 'Lỗi server khi xóa sản phẩm' });
    }
};
