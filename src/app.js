const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');   //  MongoDB connection

// Create the Express app used by the backend server.
const app = express();   

// Middleware
// Enable cross-origin requests from the frontend.
app.use(cors());

// Accept JSON bodies. The larger limit supports base64 crop images.
app.use(express.json({ limit: '10mb' })); 

// Connect to MongoDB
connectDB();

// Routes
// Farmer, dealer, admin auth, complaints, stats, and admin dashboard APIs.
const farmerRoutes = require('./routes/farmerRoutes');
app.use('/farmers', farmerRoutes);

// Crop/product listing and dealer purchase APIs.
const productRoutes = require('./routes/product');
app.use('/api/products', productRoutes);

// Payment APIs for listing fees and other transactions
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// Health check route for confirming the backend is running.
app.get('/', (req, res) => {
  res.send('Farming Assistance Backend is running with MongoDB');
});

// Start the server on the configured port or default to 5000.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
