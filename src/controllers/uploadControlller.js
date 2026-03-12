exports.upload = async (req, res) => {
    try {
        res.status(200).json({
            message: "Tải ảnh lên thành công",
            image: req.file.path,
            folder: req.file.folder
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}