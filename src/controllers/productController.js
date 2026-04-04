const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const cloudinary = require('../configs/cloudinary');

exports.getProducts = async (req, res) => {
    try {
        const data = await Product.find().populate('brand', 'name').populate('category', 'name').sort({ createdAt: -1 });
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.getNewProducts = async (req, res) => {
    try {
        // --- Lấy sản phẩm trong vòng 14 ngày gần nhất ---
        const daysAgo = 14;
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - daysAgo);

        // Sắp xếp theo thời gian tạo (createdAt: -1 là mới nhất lên đầu)
        // Lấy 8 sản phẩm cho mục "Sản phẩm mới ra mắt" ở trang chủ
        const data = await Product.find({
            createdAt: { $gte: pastDate } // $gte = greater than or equal
        }).sort({ createdAt: -1 }).limit(8);
        
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('brand', 'name').populate('category', 'name');
        
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
        res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
};