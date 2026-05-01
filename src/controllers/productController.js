const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const cloudinary = require('../configs/cloudinary');

exports.getProducts = async (req, res) => {
    try {
        // Lấy các tham số lọc, tìm kiếm và phân trang từ query URL
        const { category, brand, priceRange, sortBy, search, page = 1, limit = 9 } = req.query;
        let filter = {};

        console.log("Query parameters received:", req.query); // Log tham số truy vấn để kiểm tra

        // 1. Lọc theo danh mục (chuyển đổi từ tên sang ID)
        if (category) {
            const categoryNames = category.split(',');
            const categories = await Category.find({ name: { $in: categoryNames } });
            const categoryIds = categories.map(c => c._id);
            if (categoryIds.length > 0) filter.category = { $in: categoryIds };
        }

        // 2. Lọc theo thương hiệu (chuyển đổi từ tên sang ID)
        if (brand) {
            const brandNames = brand.split(',');
            const brands = await Brand.find({ name: { $in: brandNames } });
            const brandIds = brands.map(b => b._id);
            if (brandIds.length > 0) filter.brand = { $in: brandIds };
        }

        // 3. Lọc theo khoảng giá
        if (priceRange) {
            if (priceRange === "under-10m") filter.price = { $lt: 10000000 };
            else if (priceRange === "10m-20m") filter.price = { $gte: 10000000, $lte: 20000000 };
            else if (priceRange === "over-20m") filter.price = { $gt: 20000000 };
        }

        // 4. Lọc theo từ khóa tìm kiếm (search)
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // 'i' để không phân biệt hoa thường
            const matchedBrands = await Brand.find({ name: searchRegex });
            const matchedCategories = await Category.find({ name: searchRegex });
            
            filter.$or = [
                { name: searchRegex }, // Tìm theo tên sản phẩm
                { brand: { $in: matchedBrands.map(b => b._id) } }, // Hoặc tên thương hiệu
                { category: { $in: matchedCategories.map(c => c._id) } } // Hoặc tên danh mục
            ];
        }

        // 5. Xử lý sắp xếp
        let sortOption = { createdAt: -1 }; // Mặc định: Mới nhất lên đầu
        if (sortBy) {
            if (sortBy === "price-asc") sortOption = { price: 1 };
            else if (sortBy === "price-desc") sortOption = { price: -1 };
        }

        // 6. Lấy tổng số sản phẩm khớp với bộ lọc (để tính tổng số trang)
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // 7. Thực thi truy vấn với bộ lọc, sắp xếp và phân trang
        const data = await Product.find(filter)
            .populate('brand', 'name')
            .populate('category', 'name')
            .sort(sortOption)
            .skip((page - 1) * limit) // Bỏ qua các sản phẩm của trang trước
            .limit(Number(limit));    // Giới hạn số lượng sản phẩm trên mỗi trang
            
        // 7. Trả về dữ liệu kèm thông tin phân trang
        res.status(200).json({
            products: data,
            currentPage: Number(page),
            totalPages: totalPages
        });
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
            createdAt: { $gte: pastDate } // $gte = greater than or equal (ngày tạo phải lớn hơn hoặc bằng ngày cách đây 14 ngày)
        }).sort({ createdAt: -1 }).limit(4);
        
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

exports.getTopSaleProducts = async (req, res) => {
    try {
        // Lấy 8 sản phẩm bán chạy nhất (dựa trên trường 'sales')
        const topSaleProducts = await Product.aggregate([
            {
                $addFields: {
                    totalSales: { $sum: "variants.sold" } // Tính tổng số lượng đã bán từ tất cả các biến thể
                }
            },
            {
                $sort: { totalSales: -1 } // Sắp xếp theo tổng số lượng bán giảm dần
            },
            {
                $limit: 8 // Giới hạn kết quả chỉ lấy 8 sản phẩm
            }
        ]);
        res.status(200).json(topSaleProducts);
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm bán chạy:", error);
        res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
}