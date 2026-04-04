const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('qs');

// Hàm tiện ích sắp xếp object cho VNPay
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

exports.createOrder = async (req, res) => {
    try {
        console.log("\n=== [1] BẮT ĐẦU TẠO ĐƠN HÀNG ===");
        const userId = req.user.user_id;
        const { items, shippingInfo, paymentMethod, subtotal, shippingFee, totalAmount } = req.body;

        console.log("=== DEBUG: Dữ liệu Frontend gửi lên tạo đơn hàng ===", req.body);

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Đơn hàng không có sản phẩm.' });
        }

        // 1. Tạo đơn hàng mới với trạng thái thanh toán là 'unpaid'
        const newOrder = new Order({
            user: userId,
            items,
            shippingInfo,
            paymentMethod,
            subtotal,
            shippingFee,
            totalAmount,
            paymentStatus: 'unpaid', // Trạng thái thanh toán ban đầu
            orderStatus: 'pending'   // Trạng thái đơn hàng ban đầu
        });

        console.log("=== [2] ĐANG LƯU ĐƠN HÀNG VÀO DATABASE ===");
        await newOrder.save();
        console.log("=== [2.1] ĐÃ LƯU ĐƠN HÀNG THÀNH CÔNG ===", newOrder._id);

        // 4. Xử lý thanh toán
        if (paymentMethod === 'vnpay') {
            console.log("=== [3] BẮT ĐẦU TẠO LINK THANH TOÁN VNPAY ===");
            // --- TẠO YÊU CẦU THANH TOÁN VNPAY ---
            let ipAddr = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.connection?.socket?.remoteAddress || '127.0.0.1';
            // Chuẩn hóa IP (Lấy IP đầu tiên nếu qua proxy, đổi IPv6 localhost sang IPv4) để tránh VNPay báo lỗi định dạng
            if (typeof ipAddr === 'string') ipAddr = ipAddr.split(',')[0].trim();
            if (Array.isArray(ipAddr)) ipAddr = ipAddr[0].trim();
            
            // Xử lý dứt điểm lỗi IP khi dùng ngrok: VNPay không hỗ trợ tốt IPv6, ép tất cả IPv6 về IPv4
            if (ipAddr.includes(':')) ipAddr = '127.0.0.1';

            // Lấy biến môi trường và sử dụng .trim() để cắt bỏ khoảng trắng thừa (Rất hay bị lỗi nếu copy dư dấu cách trong file .env)
            const tmnCode = process.env.VNP_TMN_CODE?.trim();
            const secretKey = process.env.VNP_HASH_SECRET?.trim();
            let vnpUrl = process.env.VNP_URL?.trim();
            const returnUrl = process.env.VNP_RETURN_URL?.trim();

            console.log("TMN Code:", tmnCode);
            console.log("Secret Key:", secretKey);
            console.log("VNP URL:", vnpUrl);
            console.log("Return URL:", returnUrl);


            // Ép múi giờ Việt Nam (GMT+7) để không bị lỗi nếu server/máy tính bị sai giờ
            const date = new Date();
            const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
            const createDate = vnTime.getUTCFullYear() +
                ('0' + (vnTime.getUTCMonth() + 1)).slice(-2) +
                ('0' + vnTime.getUTCDate()).slice(-2) +
                ('0' + vnTime.getUTCHours()).slice(-2) +
                ('0' + vnTime.getUTCMinutes()).slice(-2) +
                ('0' + vnTime.getUTCSeconds()).slice(-2);
                
            // Tạo thời gian hết hạn (15 phút sau khi tạo đơn) để VNPay không bị treo
            const expireTime = new Date(vnTime.getTime() + 15 * 60 * 1000);
            const expireDate = expireTime.getUTCFullYear() +
                ('0' + (expireTime.getUTCMonth() + 1)).slice(-2) +
                ('0' + expireTime.getUTCDate()).slice(-2) +
                ('0' + expireTime.getUTCHours()).slice(-2) +
                ('0' + expireTime.getUTCMinutes()).slice(-2) +
                ('0' + expireTime.getUTCSeconds()).slice(-2);

            console.log("=== [3.1] Thời gian tạo:", createDate, " | Hết hạn:", expireDate);

            const orderId = newOrder._id.toString();
            const amount = totalAmount;
            
            let vnp_Params = {};
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = tmnCode;
            vnp_Params['vnp_Locale'] = 'vn';
            vnp_Params['vnp_CurrCode'] = 'VND';
            vnp_Params['vnp_TxnRef'] = orderId;
            vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
            vnp_Params['vnp_OrderType'] = 'other';
            vnp_Params['vnp_Amount'] = Math.round(amount * 100); // Đảm bảo số tiền luôn là số nguyên
            vnp_Params['vnp_ReturnUrl'] = returnUrl;
            vnp_Params['vnp_IpAddr'] = ipAddr;
            vnp_Params['vnp_CreateDate'] = createDate;
            vnp_Params['vnp_ExpireDate'] = expireDate;

            console.log("=== [3.2] Tham số VNPay trước khi ký ===", vnp_Params);
            vnp_Params = sortObject(vnp_Params);

            // Bỏ hoàn toàn thư viện qs để tránh lỗi parse khi khởi động lại server
            const signData = Object.entries(vnp_Params).map(([key, val]) => `${key}=${val}`).join('&');
            console.log("=== [3.3] Chuỗi SignData (Dùng để băm) ===", signData);
            const hmac = crypto.createHmac("sha512", secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); // Đã xóa chữ 'new' ở Buffer.from
            console.log("=== [3.4] Mã Hash tạo ra ===", signed);
            vnp_Params['vnp_SecureHash'] = signed;
            vnpUrl += '?' + Object.entries(vnp_Params).map(([key, val]) => `${key}=${val}`).join('&');

            console.log("=== [4] URL VNPAY HOÀN CHỈNH ===", vnpUrl);
            try {
                return res.status(201).json({ message: 'Đơn hàng đã được tạo, vui lòng thanh toán.', payUrl: vnpUrl });
            } catch (paymentError) {
                console.error('=== [!] LỖI KHI TẠO LINK VNPAY ===', paymentError);
                // Không lưu đơn hàng nếu lỗi khởi tạo
                await Order.findByIdAndDelete(newOrder._id);
                return res.status(500).json({ message: 'Không thể khởi tạo thanh toán. Vui lòng thử lại.' });
            }
        } else {
            console.log("=== [3] BẮT ĐẦU XỬ LÝ THANH TOÁN COD ===");
            // Phương thức COD
            newOrder.paymentStatus = 'paid_on_delivery';
            await newOrder.save();
            
            console.log("=== [3.1] Đang cập nhật tồn kho ===");
            // Cập nhật số lượng tồn kho và số lượng đã bán
            for (const item of items) {
                await Product.updateOne(
                    { _id: item.product, "variants.color": item.color },
                    { $inc: { "variants.$.quantity": -item.quantity, "variants.$.sold": item.quantity, "sold": item.quantity } }
                );
            }

            console.log("=== [3.2] Đang xóa giỏ hàng ===");
            // Xóa sản phẩm khỏi giỏ hàng
            const itemsToRemove = items.map(item => ({ product: item.product, color: item.color }));
            if (itemsToRemove.length > 0) {
                await Cart.updateOne(
                    { user: userId },
                    { $pull: { items: { $or: itemsToRemove } } }
                );
            }

            console.log("=== [4] ĐẶT HÀNG COD THÀNH CÔNG ===");
            res.status(201).json({ message: 'Đặt hàng thành công!', order: newOrder });
        }
    } catch (error) {
        console.error('=== [!] LỖI TỔNG THỂ KHI TẠO ĐƠN HÀNG ===', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi tạo đơn hàng.' });
    }
};

exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Tự động dọn dẹp các đơn hàng VNPay "rác" (bị bỏ dở không thanh toán) quá 30 phút
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        await Order.deleteMany({
            user: userId,
            paymentMethod: 'vnpay',
            paymentStatus: 'unpaid',
            createdAt: { $lt: thirtyMinutesAgo }
        });
        
        // Tìm đơn hàng của user, sắp xếp mới nhất lên đầu, populate thông tin sản phẩm
        const orders = await Order.find({ user: userId })
            .populate('items.product', 'name variants _id')
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách đơn hàng.' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.user_id;

        // Tìm đơn hàng thuộc về user hiện tại
        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        if (order.orderStatus === 'pending') {
            // Nếu đơn hàng VNPay chưa thanh toán bị hủy -> xóa hẳn đơn hàng
            if (order.paymentStatus === 'unpaid') {
                await Order.findByIdAndDelete(orderId);
                return res.status(200).json({ message: 'Đã xóa giao dịch chưa thanh toán.' });
            }

            order.orderStatus = 'cancelled';
            
            // Hoàn tiền nếu đã thanh toán online qua VNPay
            if (order.paymentMethod === 'vnpay' && order.paymentStatus === 'paid' && order.vnpayTransId) {
                    const vnp_TmnCode = process.env.VNP_TMN_CODE?.trim();
                    const secretKey = process.env.VNP_HASH_SECRET?.trim();
                const vnp_Api = process.env.VNP_API_URL;
                
                const vnp_TxnRef = order._id.toString();
                const vnp_TransactionDate = order.vnpayPayDate;
                const vnp_Amount = order.totalAmount * 100;
                const vnp_TransactionType = '02'; // Hoàn tiền toàn phần
                const vnp_CreateBy = 'User'; // Ghi chú người thực hiện là User
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
                    console.log("=== KẾT QUẢ GỌI API HOÀN TIỀN VNPAY ===");
                    console.log(vnpayRefundResponse.data);
                    if (vnpayRefundResponse.data && vnpayRefundResponse.data.vnp_ResponseCode === '00') {
                        order.paymentStatus = 'refunded';
                        console.log(`-> Hoàn tiền thành công cho đơn hàng: ${vnp_TxnRef}`);
                    } else {
                        order.paymentStatus = 'refund_failed';
                        console.error(`-> Hoàn tiền thất bại! Mã lỗi: ${vnpayRefundResponse.data?.vnp_ResponseCode} - Lời nhắn: ${vnpayRefundResponse.data?.vnp_Message}`);
                    }
                } catch (refundError) {
                    console.error("-> Lỗi gọi API VNPay (Crash hệ thống mạng/Cấu hình sai URL):", refundError.message);
                    order.paymentStatus = 'refund_failed';
                }
            }

            // Hoàn lại số lượng kho và trừ đi số lượng đã bán
            for (const item of order.items) {
                await Product.updateOne(
                    { _id: item.product, "variants.color": item.color },
                    { $inc: { "variants.$.quantity": item.quantity, "variants.$.sold": -item.quantity, "sold": -item.quantity } }
                );
            }
            
            await order.save();

            return res.status(200).json({ message: 'Hủy đơn hàng thành công.', order });
        } else if (order.orderStatus === 'shipping') {
            order.cancelRequest = true;
            await order.save();
            return res.status(200).json({ message: 'Đã gửi yêu cầu hủy đơn đến quản trị viên.', order });
        } else {
            return res.status(400).json({ message: 'Chỉ có thể hủy hoặc yêu cầu hủy ở trạng thái chờ lấy hàng hoặc đang giao.' });
        }
    } catch (error) {
        console.error('Lỗi khi hủy đơn hàng:', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi hủy đơn hàng.' });
    }
};

// Controller xử lý IPN từ VNPay
exports.handleVNPayIPN = async (req, res) => {
    console.log("--- VNPay IPN: Yêu cầu nhận được ---");
    console.log("Query Params:", req.query);

    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const secretKey = process.env.VNP_HASH_SECRET?.trim();
    const signData = Object.entries(vnp_Params).map(([key, val]) => `${key}=${val}`).join('&');
    const hmac = crypto.createHmac("sha512", secretKey || "");
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     

    console.log("Generated Hash:", signed);
    console.log("VNPay Hash:    ", secureHash);

    if(secureHash === signed){
        const orderId = vnp_Params['vnp_TxnRef'];
        const rspCode = vnp_Params['vnp_ResponseCode'];
        const transId = vnp_Params['vnp_TransactionNo'];
        const payDate = vnp_Params['vnp_PayDate'];

        console.log("Checksum hợp lệ. Bắt đầu xử lý đơn hàng.");
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                console.log(`IPN: Không tìm thấy đơn hàng với ID: ${orderId}`);
                return res.status(200).json({RspCode: '01', Message: 'Order not found'});
            }
            console.log(`IPN: Tìm thấy đơn hàng. Trạng thái thanh toán hiện tại: ${order.paymentStatus}`);

            // Chỉ xử lý nếu đơn hàng đang ở trạng thái 'unpaid' để tránh xử lý lại
            if (order.paymentStatus === 'unpaid') {
                if (rspCode === '00') { // Thanh toán thành công
                    order.paymentStatus = 'paid';
                    order.vnpayTransId = transId; 
                    order.vnpayPayDate = payDate;
                    await order.save();
                    console.log(`IPN SUCCESS: Đơn hàng ${orderId} đã được cập nhật trạng thái 'paid'.`);
                    
                    // Trừ tồn kho và cập nhật số lượng bán
                    for (const item of order.items) {
                        await Product.updateOne(
                            { _id: item.product, "variants.color": item.color },
                            { $inc: { "variants.$.quantity": -item.quantity, "variants.$.sold": item.quantity, "sold": item.quantity } }
                        );
                    }
                    // Xóa giỏ hàng
                    const itemsToRemove = order.items.map(item => ({ product: item.product, color: item.color }));
                    if (itemsToRemove.length > 0) {
                        await Cart.updateOne({ user: order.user }, { $pull: { items: { $or: itemsToRemove } } });
                    }
                } else { // Thanh toán thất bại
                    // Xóa đơn hàng nếu không thanh toán thành công
                    await Order.findByIdAndDelete(orderId);
                    console.log(`IPN FAILED: Giao dịch thất bại, đã xóa đơn hàng ${orderId}.`);
                }
            } else {
                console.log(`IPN: Bỏ qua xử lý vì đơn hàng ${orderId} không ở trạng thái 'unpaid'.`);
            }
            return res.status(200).json({RspCode: '00', Message: 'Confirm Success'});
        } catch (error) {
            console.error("VNPay IPN Error:", error);
            return res.status(200).json({RspCode: '99', Message: 'Unknown error'});
        }
    } else {
        console.log("Checksum không hợp lệ.");
        return res.status(200).json({RspCode: '97', Message: 'Fail checksum'});
    }
};