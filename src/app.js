const express = require('express');
const cors = require('cors');

const app = express();

// router
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const reviewRoutes = require('./routes/review.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)

module.exports = app;
