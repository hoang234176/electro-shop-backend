exports.infoFileUpload = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có ảnh nào được tải lên'});
        }
        return res.status(200).json({
            message: "Tải ảnh lên thành công",
            image: req.file.secure_url || req.file.path,
            folder: req.file.folder
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Tải ảnh lên thất bại' });
    }
}