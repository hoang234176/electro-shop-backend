const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Brand = require("../models/Brand");
const Category = require("../models/Category");
const cloudinary = require('../configs/cloudinary');
const axios = require('axios');
const crypto = require('crypto');
const { getPublicIdFromUrl } = require('../utils/cloudinaryHelper');

exports.userManager = async (req, res) => {
    try{
        const data = await User.find();
        res.status(200).json(data);
    } catch (error){
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        // Không cho phép xóa tài khoản Admin khác để bảo vệ hệ thống
        if (user.role === 'ADMIN') {
            return res.status(403).json({ message: 'Không thể xóa tài khoản của quản trị viên.' });
        }

        // Xóa avatar trên Cloudinary nếu đó không phải là avatar mặc định
        if (user.avatar && user.avatar !== process.env.DEFAULT_AVATAR_URL) {
            const publicId = getPublicIdFromUrl(user.avatar);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }

        // Xóa người dùng khỏi cơ sở dữ liệu
        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: `Đã xóa người dùng ${user.email} thành công.` });

    } catch (error) {
        console.error("Lỗi khi xóa người dùng:", error);
        res.status(500).json({ message: 'Lỗi máy chủ khi xóa người dùng.' });
    }
}

exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        // Xóa tất cả ảnh của các phiên bản trên Cloudinary
        if (product.variants && product.variants.length > 0) {
            const deleteImagePromises = product.variants.map(async (variant) => {
                if (variant.image) {
                    const publicId = getPublicIdFromUrl(variant.image);
                    if (publicId) {
                        return cloudinary.uploader.destroy(publicId);
                    }
                }
            });
            await Promise.all(deleteImagePromises);
        }

        // Xóa sản phẩm khỏi cơ sở dữ liệu
        await Product.findByIdAndDelete(productId);

        res.status(200).json({ message: `Đã xóa sản phẩm "${product.name}" thành công.` });
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        res.status(500).json({ message: 'Lỗi máy chủ khi xóa sản phẩm.' });
    }
}

exports.addProducts = async (req, res) => {
    const uploadedFiles = req.files || []; // Đảm bảo uploadedFiles luôn là một mảng

    try {
        // 1. Lấy và parse dữ liệu từ req.body
        const { name, brand: brandName, category: categoryName, importPrice, price, description } = req.body;
        const variants = JSON.parse(req.body.variants);
        const specifications = JSON.parse(req.body.specifications);

        // 2. Tìm ID của Brand và Category từ tên của chúng
        const brand = await Brand.findOne({ name: brandName });
        if (!brand) {
            return res.status(400).json({ message: `Thương hiệu "${brandName}" không tồn tại.` });
        }

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(400).json({ message: `Danh mục "${categoryName}" không tồn tại.` });
        }

        // 3. Kết hợp dữ liệu variants với URL ảnh đã tải lên
        // Logic này cho phép không có ảnh nào được tải lên (uploadedFiles sẽ là mảng rỗng)
        const populatedVariants = variants.map((variant, index) => {
            return {
                color: variant.color,
                storage: variant.storage,
                quantity: variant.quantity,
                image: uploadedFiles[index] ? uploadedFiles[index].path : '' // Lấy URL ảnh nếu có
            };
        });

        // 4. Tạo sản phẩm mới
        const newProduct = new Product({
            name,
            brand: brand._id,
            category: category._id,
            importPrice: Number(importPrice),
            price: Number(price),
            description,
            variants: populatedVariants,
            specifications
        });

        // 5. Lưu vào cơ sở dữ liệu
        await newProduct.save();

        res.status(201).json({ message: "Thêm sản phẩm thành công!", product: newProduct });
    } catch (error) {
        console.error("Lỗi khi thêm sản phẩm:", error);
        // Nếu có lỗi xảy ra sau khi đã tải file lên, cần xóa file đó đi để tránh rác
        if (uploadedFiles.length > 0) {
            const publicIds = uploadedFiles.map(file => file.filename);
            await cloudinary.api.delete_resources(publicIds);
        }
        res.status(500).json({ message: 'Lỗi máy chủ khi thêm sản phẩm.' });
    }
}

exports.editProduct = async (req, res) => {
    const uploadedFiles = req.files || [];
    try {
        const productId = req.params.id;
        const { name, brand: brandName, category: categoryName, importPrice, price, description } = req.body;
        const variants = req.body.variants ? JSON.parse(req.body.variants) : [];
        const specifications = req.body.specifications ? JSON.parse(req.body.specifications) : {};

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        const brand = await Brand.findOne({ name: brandName });
        if (!brand) {
            return res.status(400).json({ message: `Thương hiệu "${brandName}" không tồn tại.` });
        }

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(400).json({ message: `Danh mục "${categoryName}" không tồn tại.` });
        }

        // Xóa ảnh của các phiên bản bị xóa khỏi danh sách hoặc bị thay ảnh mới
        const incomingImages = variants.map(v => v.image).filter(img => img);
        for (const oldVariant of product.variants) {
            if (oldVariant.image && !incomingImages.includes(oldVariant.image)) {
                const publicId = getPublicIdFromUrl(oldVariant.image);
                if (publicId) await cloudinary.uploader.destroy(publicId).catch(err => console.error("Lỗi xóa ảnh cũ:", err));
            }
        }

        let fileIndex = 0;
        // Cập nhật lại thông tin variants, giữ lại `sold` và `quantity`, đồng thời map ảnh mới
        const updatedVariants = variants.map((variant) => {
            let finalImage = variant.image;
            const existingVariant = product.variants.find(v => v.color === variant.color);
            
            if (variant.isNewImage && uploadedFiles[fileIndex]) {
                finalImage = uploadedFiles[fileIndex].path;
                fileIndex++;
            }

            return {
                color: variant.color,
                quantity: existingVariant ? existingVariant.quantity : (variant.quantity || 0),
                image: finalImage,
                sold: existingVariant ? existingVariant.sold : 0
            };
        });

        // Cập nhật dữ liệu
        product.name = name;
        product.brand = brand._id;
        product.category = category._id;
        product.importPrice = Number(importPrice);
        product.price = Number(price);
        product.description = description;
        product.variants = updatedVariants;
        product.specifications = specifications;

        await product.save();

        res.status(200).json({ message: "Cập nhật thông tin sản phẩm thành công!", product });
    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        if (uploadedFiles.length > 0) {
            const publicIds = uploadedFiles.map(file => file.filename);
            await cloudinary.api.delete_resources(publicIds).catch(err => console.error(err));
        }
        res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật sản phẩm.' });
    }
}

exports.importProduct = async (req, res) => {
    const uploadedFiles = req.files || [];

    try {
        const productId = req.params.id;
        const { name, brand: brandName, category: categoryName, importPrice, price, description } = req.body;
        const variants = req.body.variants ? JSON.parse(req.body.variants) : [];
        const specifications = req.body.specifications ? JSON.parse(req.body.specifications) : {};

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        const brand = await Brand.findOne({ name: brandName });
        if (!brand) {
            return res.status(400).json({ message: `Thương hiệu "${brandName}" không tồn tại.` });
        }

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(400).json({ message: `Danh mục "${categoryName}" không tồn tại.` });
        }

        let fileIndex = 0;
        // Map ảnh mới và giữ lại số lượng đã bán (sold) cho phiên bản cũ
        const updatedVariants = await Promise.all(variants.map(async (variant) => {
            let finalImage = variant.image; 
            const existingVariant = product.variants.find(v => v.color === variant.color);
            
            if (variant.isNewImage && uploadedFiles[fileIndex]) {
                if (existingVariant && existingVariant.image) {
                    const publicId = getPublicIdFromUrl(existingVariant.image);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId).catch(err => console.error("Lỗi xóa ảnh cũ:", err));
                    }
                }
                finalImage = uploadedFiles[fileIndex].path;
                fileIndex++;
            }
            
            return {
                color: variant.color,
                quantity: variant.quantity,
                image: finalImage,
                sold: existingVariant ? existingVariant.sold : 0
            };
        }));

        // Cập nhật dữ liệu
        product.name = name;
        product.brand = brand._id;
        product.category = category._id;
        product.importPrice = Number(importPrice);
        product.price = Number(price);
        product.description = description;
        product.variants = updatedVariants;
        product.specifications = specifications;

        await product.save();

        res.status(200).json({ message: "Nhập hàng và cập nhật sản phẩm thành công!", product });
    } catch (error) {
        console.error("Lỗi khi nhập hàng:", error);
        if (uploadedFiles.length > 0) {
            const publicIds = uploadedFiles.map(file => file.filename);
            await cloudinary.api.delete_resources(publicIds).catch(err => console.error(err));
        }
        res.status(500).json({ message: 'Lỗi máy chủ khi nhập hàng.' });
    }
}

exports.getAllOrders = async (req, res) => {
    try {
        // Tự động dọn dẹp toàn bộ đơn hàng VNPay "rác" (bị bỏ dở không thanh toán) quá 30 phút trên toàn hệ thống
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        await Order.deleteMany({
            paymentMethod: 'vnpay',
            paymentStatus: 'unpaid',
            createdAt: { $lt: thirtyMinutesAgo }
        });

        const orders = await Order.find({})
            .populate('user', 'fullname phone email')
            .populate('items.product', 'name variants _id')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Lỗi khi lấy tất cả đơn hàng:', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi lấy tất cả đơn hàng.' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectCancel } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        // Logic từ chối yêu cầu hủy của Admin
        if (rejectCancel) {
            order.cancelRequest = false;
            await order.save();
            return res.status(200).json({ message: 'Đã từ chối yêu cầu hủy đơn.', order });
        }

        const validStatuses = ['pending', 'shipping', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }

        const oldStatus = order.orderStatus;
        
        if (oldStatus !== status) {
            // Logic hoàn tiền và hoàn kho khi hủy đơn
            if (status === 'cancelled') {
                // 1. Hoàn kho (chỉ khi đơn hàng chưa bị hủy trước đó)
                if (oldStatus !== 'cancelled') {
                    for (const item of order.items) {
                        await Product.updateOne(
                            { _id: item.product, "variants.color": item.color },
                            { $inc: { "variants.$.quantity": item.quantity, "variants.$.sold": -item.quantity, "sold": -item.quantity } }
                        );
                    }
                }

                // 2. Hoàn tiền nếu đã thanh toán online qua VNPay
                if (order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid' && order.vnpayTransId) {
                    const vnp_TmnCode = process.env.VNP_TMN_CODE?.trim();
                    const secretKey = process.env.VNP_HASH_SECRET?.trim();
                    const vnp_Api = process.env.VNP_API_URL;
                    
                    const vnp_TxnRef = order._id.toString();
                    const vnp_TransactionDate = order.vnpayPayDate;
                    const vnp_Amount = order.totalAmount * 100;
                    const vnp_TransactionType = '02'; // Hoàn tiền toàn phần
                    const vnp_CreateBy = req.user?.email || 'Admin'; 
                    const vnp_TransactionNo = order.vnpayTransId;
                    
                    const date = new Date();
                    const vnp_CreateDate = date.getFullYear() +
                        ('0' + (date.getMonth() + 1)).slice(-2) +
                        ('0' + date.getDate()).slice(-2) +
                        ('0' + date.getHours()).slice(-2) +
                        ('0' + date.getMinutes()).slice(-2) +
                        ('0' + date.getSeconds()).slice(-2);
                        
                    const vnp_RequestId = date.getTime().toString();
                    const vnp_Version = '2.1.0';
                    const vnp_Command = 'refund';
                    const vnp_OrderInfo = 'Hoan tien don hang ' + vnp_TxnRef;
                    const vnp_IpAddr = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.connection?.socket?.remoteAddress || '127.0.0.1';

                    const data = `${vnp_RequestId}|${vnp_Version}|${vnp_Command}|${vnp_TmnCode}|${vnp_TransactionType}|${vnp_TxnRef}|${vnp_Amount}|${vnp_TransactionNo}|${vnp_TransactionDate}|${vnp_CreateBy}|${vnp_CreateDate}|${vnp_IpAddr}|${vnp_OrderInfo}`;
                    const hmac = crypto.createHmac("sha512", secretKey);
                    const vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex");

                    const dataObj = {
                        vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode, vnp_TransactionType, vnp_TxnRef,
                        vnp_Amount, vnp_TransactionNo, vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr, vnp_OrderInfo,
                        vnp_SecureHash
                    };

                    try {
                        const vnpayRefundResponse = await axios.post(vnp_Api, dataObj);
                        if (vnpayRefundResponse.data && vnpayRefundResponse.data.vnp_ResponseCode === '00') {
                            order.paymentStatus = 'refunded'; // Cập nhật trạng thái đã hoàn tiền
                            console.log(`Hoàn tiền VNPay thành công cho đơn hàng ${vnp_TxnRef}`);
                        } else {
                            console.error(`Hoàn tiền VNPay thất bại cho đơn hàng ${vnp_TxnRef}:`, vnpayRefundResponse.data.vnp_Message);
                            order.paymentStatus = 'refund_failed';
                        }
                    } catch (refundError) {
                        console.error(`Lỗi API khi hoàn tiền VNPay cho đơn hàng ${vnp_TxnRef}:`, refundError);
                        order.paymentStatus = 'refund_failed';
                    }
                }
            }
            
            // Cập nhật trạng thái đơn hàng
            order.orderStatus = status;
            // Nếu admin duyệt hủy (approve cancel), thì cờ cancelRequest cũng cần được reset
            if (status === 'cancelled') {
                order.cancelRequest = false;
            }
            await order.save();
        } else {
             await order.save();
        }

        res.status(200).json({ message: `Cập nhật trạng thái đơn hàng thành công.`, order });
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
        res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
};