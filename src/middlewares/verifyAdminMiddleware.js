const verifyAdmin = (req, res, next) => {
    // Middleware này phải được chạy SAU verifyToken để req.user đã được gán dữ liệu
    if (req.user && req.user.role === 'ADMIN') {
        next(); // Nếu là Admin, cho phép đi tiếp vào Controller
    } else {
        console.log('Từ chối truy cập: Không phải Admin');
        return res.status(403).json({ message: 'Quyền truy cập bị từ chối. Hành động này yêu cầu quyền Quản trị viên (ADMIN).' });
    }
};

module.exports = verifyAdmin;