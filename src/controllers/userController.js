const User = require('../models/User');
const cloudinary = require('../configs/cloudinary');
const { getPublicIdFromUrl } = require('../utils/cloudinaryHelper');
const bcrypt = require('bcryptjs');

exports.userInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user.user_id).select('fullname email phone address createdAt');
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

exports.updateUser = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const infoUpdate = {
            fullname: req.body.fullName, 
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
        }

        // --- KIỂM TRA EMAIL ---
        const isEmail = await User.findOne({ email: req.body.email, _id: { $ne: userId } });
        if (isEmail) {
            // Nếu có ảnh vừa up lên -> Xóa rác trên Cloudinary ngay
            if (req.file) {
                console.log('xóa ảnh cũ')
                await cloudinary.uploader.destroy(req.file.filename); 
            }
            console.log('Email này đã tồn tại')
            return res.status(400).json({ message: 'Email này đã tồn tại' });
        }

        // --- KIỂM TRA SỐ ĐIỆN THOẠI ---
        const isPhone = await User.findOne({ phone: req.body.phone, _id: { $ne: userId } });
        if (isPhone) {
            // Tương tự, nếu có ảnh vừa up -> Xóa
            if (req.file) {
                console.log('xóa ảnh cũ')
                await cloudinary.uploader.destroy(req.file.filename);
            }
            console.log('Số điện thoại này đã tồn tại')
            return res.status(400).json({ message: 'Số điện thoại này đã tồn tại' });
        }

        if (req.file) {
            infoUpdate.avatar = req.file.path; 
            
            // Tìm thông tin user hiện tại (chỉ lấy trường avatar) để lấy URL ảnh cũ
            const currentUser = await User.findById(userId).select('avatar');
            if (currentUser?.avatar && currentUser.avatar !== process.env.DEFAULT_AVATAR_URL) {
                const publicId = getPublicIdFromUrl(currentUser.avatar);
                if (publicId) {
                    console.log('Xóa ảnh cũ trên Cloudinary:', publicId);
                    await cloudinary.uploader.destroy(publicId);
                }
            }
        }
        
        // --- NẾU MỌI THỨ HỢP LỆ THÌ MỚI LƯU DB ---
        const user = await User.findByIdAndUpdate(userId, infoUpdate, { new: true });
        
        return res.status(200).json({ 
            message: 'Cập nhật thành công',
            avatarURL: req.file.path
        });
    } catch (error) {
        console.error(error);
        
        // Dọn rác cả trong trường hợp Server bị sập bất ngờ (Lỗi 500)
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        
        return res.status(500).json({ message: 'Server error' });
    }      
}

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const isCheckPwd = await bcrypt.compare(oldPassword, user.password);
        if (!isCheckPwd) {
            return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });     
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}