const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên danh mục không được để trống'],
        unique: true,
        trim: true
    }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;