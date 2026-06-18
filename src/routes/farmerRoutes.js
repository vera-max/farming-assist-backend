const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const FarmerComplaint = require('../models/FarmerComplaint');
const Purchase = require('../models/Purchase');
const Home = require('../models/product');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Reads the JWT from the request and allows only farmers to continue.
const getLoggedInFarmer = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    const err = new Error('Please login first');
    err.statusCode = 401;
    throw err;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.role !== 'farmer') {
    const err = new Error('Only farmers can access this resource');
    err.statusCode = 403;
    throw err;
  }

  return decoded;
};

// Reads the JWT from the request and allows only admins to continue.
const getLoggedInAdmin = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    const err = new Error('Please login first');
    err.statusCode = 401;
    throw err;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.role !== 'admin') {
    const err = new Error('Only admins can access this resource');
    err.statusCode = 403;
    throw err;
  }

  return decoded;
};


// Authenticate a user and return a role-based JWT for the frontend.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const farmer = await Farmer.findOne({ email: email.toLowerCase() });
    if (!farmer) return res.status(400).json({ error: 'Farmer not found' });

    const isMatch = await bcrypt.compare(password, farmer.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Only one token, with role included
    const token = jwt.sign(
      { id: farmer._id, role: farmer.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ token, farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Register a farmer/dealer/admin account and immediately return a JWT.
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, location, role } = req.body;
    const cameroonPhonePattern = /^\+237\d{9}$/;

    if (!cameroonPhonePattern.test(phone || '')) {
      return res.status(400).json({ error: 'Contact must be in Cameroon format: +237 followed by 9 numbers' });
    }

    // Check if farmer already exists
    const existingFarmer = await Farmer.findOne({ email: email.toLowerCase() });
    if (existingFarmer) {
      return res.status(400).json({ error: 'Farmer already exists' });
    }

    const farmer = new Farmer({
      name,
      email: email.toLowerCase(), // store email in lowercase
      phone,
      password,
      location,
      role
    });

    await farmer.save();

    const token = jwt.sign(
      { id: farmer._id, role: farmer.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'Farmer registered successfully', token, farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public farmer profile for dealers viewing a crop.
// Only exposes contact/profile fields needed to arrange an outside transaction.
router.get('/public/:id', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id).select('name email phone location role createdAt');

    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const crops = await Home.find({ farmerId: farmer._id })
      .select('name price quantity image description')
      .sort({ createdAt: -1 });

    res.json({ farmer, crops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Farmers submit complaints for admins to monitor and resolve.
router.post('/complaints', async (req, res) => {
  try {
    const { category, description } = req.body;
    const decoded = getLoggedInFarmer(req);

    if (!description) {
      return res.status(400).json({ error: 'Complaint description is required' });
    }

    const complaint = await FarmerComplaint.create({
      farmerId: decoded?.id,
      category,
      description,
      status: 'Pending'
    });

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Live farmer dashboard totals for crops, pending purchases, and complaints.
router.get('/stats', async (req, res) => {
  try {
    const decoded = getLoggedInFarmer(req);

    const [activeCrops, pendingDeliveries, complaintsSubmitted] = await Promise.all([
      Home.countDocuments({ farmerId: decoded.id, quantity: { $gt: 0 } }),
      Purchase.countDocuments({ farmerId: decoded.id, status: 'Pending' }),
      FarmerComplaint.countDocuments({ farmerId: decoded.id })
    ]);

    res.json({
      activeCrops,
      pendingDeliveries,
      complaintsSubmitted
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Farmer view of dealer purchase requests for their posted crops.
router.get('/deliveries', async (req, res) => {
  try {
    const decoded = getLoggedInFarmer(req);

    const deliveries = await Purchase.find({ farmerId: decoded.id })
      .populate('productId', 'name price image')
      .populate('dealerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(deliveries);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Farmer updates delivery progress for one of their crop purchases.
router.patch('/deliveries/:id/status', async (req, res) => {
  try {
    const decoded = getLoggedInFarmer(req);
    const allowedStatuses = ['Pending', 'Confirmed', 'In Transit', 'Delivered', 'Completed', 'Cancelled'];
    const { status } = req.body;
    const trackingNote = String(req.body.trackingNote || '').trim();
    const deliveryDate = req.body.deliveryDate ? new Date(req.body.deliveryDate) : undefined;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) {
      return res.status(400).json({ error: 'Invalid delivery date' });
    }

    const updates = { status };
    if (trackingNote) updates.trackingNote = trackingNote;
    if (deliveryDate) updates.deliveryDate = deliveryDate;

    // farmerId in the filter prevents a farmer from updating another farmer's delivery.
    const delivery = await Purchase.findOneAndUpdate(
      { _id: req.params.id, farmerId: decoded.id },
      updates,
      { new: true }
    )
      .populate('productId', 'name price image')
      .populate('dealerId', 'name email phone');

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json({ message: 'Delivery status updated', delivery });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin overview totals used by the admin dashboard.
router.get('/admin/overview', async (req, res) => {
  try {
    getLoggedInAdmin(req);

    const [farmers, dealers, admins, activeCrops, pendingComplaints, totalComplaints, pendingPurchases] = await Promise.all([
      Farmer.countDocuments({ role: 'farmer' }),
      Farmer.countDocuments({ role: 'dealer' }),
      Farmer.countDocuments({ role: 'admin' }),
      Home.countDocuments({ quantity: { $gt: 0 } }),
      FarmerComplaint.countDocuments({ status: 'Pending' }),
      FarmerComplaint.countDocuments(),
      Purchase.countDocuments({ status: 'Pending' })
    ]);

    res.json({
      farmers,
      dealers,
      admins,
      activeCrops,
      pendingComplaints,
      totalComplaints,
      pendingPurchases
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin list of all registered users across farmer, dealer, and admin roles.
router.get('/admin/users', async (req, res) => {
  try {
    getLoggedInAdmin(req);

    const users = await Farmer.find()
      .select('name email phone role createdAt')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin complaint queue with farmer contact details included.
router.get('/admin/complaints', async (req, res) => {
  try {
    getLoggedInAdmin(req);

    const complaints = await FarmerComplaint.find()
      .populate('farmerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin updates a complaint as Pending, In Review, or Resolved.
router.patch('/admin/complaints/:id', async (req, res) => {
  try {
    getLoggedInAdmin(req);

    const { status } = req.body;
    const allowedStatuses = ['Pending', 'In Review', 'Resolved'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid complaint status' });
    }

    const complaint = await FarmerComplaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('farmerId', 'name email phone');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json(complaint);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
