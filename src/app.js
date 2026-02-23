const express = require('express');
const cors = require('cors');

const app = express();
// router
const authRoutes = require('./routes/auth.routes');

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

module.exports = app;
