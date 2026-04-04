const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        console.log('Bạn chưa đăng nhập - thiếu token');
        return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
    } else {
        try {
            console.log('Bạn đã đăng nhập - có token');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.log('Bạn chưa đăng nhập - token error');
            return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
        }
    }
};

module.exports = verifyToken;