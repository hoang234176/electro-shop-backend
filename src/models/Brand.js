const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên thương hiệu không được để trống'],
        unique: true,
        trim: true
    }
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;