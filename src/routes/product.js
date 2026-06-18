const express = require('express');
const router = express.Router();
const Home = require('../models/product');
const Purchase = require('../models/Purchase');
const jwt = require('jsonwebtoken');
const { validateDigitalSignature, enforceSecureHeaders, validateTokenFreshness } = require('../middleware/paymentSecurity');

const HOME_PAGE_LISTING_FEE = 500;
const LINK_CHARGE_RATE = 0.05;

// Apply security headers to all payment-related routes
router.use(enforceSecureHeaders);

// Helper function used by protected routes.
// It reads the Authorization header, extracts the JWT, and verifies it.
const getUserFromToken = (req) => {
  // Expected header format: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  // Stop the request early if the user is not logged in.
  if (!token) {
    const err = new Error('No token provided');
    err.statusCode = 401;
    throw err;
  }

  // If the token is invalid or expired, jwt.verify will throw an error.
  return jwt.verify(token, process.env.JWT_SECRET);
};

const getBearerToken = (req) => req.headers.authorization?.split(' ')[1] || '';

const createPaymentSignature = (paymentData, token) => {
  const orderedData = Object.keys(paymentData)
    .sort()
    .reduce((acc, key) => {
      acc[key] = paymentData[key];
      return acc;
    }, {});

  const signatureInput = JSON.stringify(orderedData) + token;
  let hash = 0;

  for (let index = 0; index < signatureInput.length; index += 1) {
    const char = signatureInput.charCodeAt(index);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }

  return Math.abs(hash).toString(16);
};

// Farmer posts a crop/product listing.
// This route is protected: only logged-in farmers can create products.
router.post('/', async (req, res) => {
  try {
    // Decode the logged-in user's id and role from the token.
    const decoded = getUserFromToken(req);

    // Dealers and admins are not allowed to post crops.
    if (decoded.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can post crops' });
    }

    const listingFeeAmount = Number(req.body.listingFeeAmount || 0);
    const listingFeePaid = Boolean(req.body.listingFeePaid) && listingFeeAmount >= HOME_PAGE_LISTING_FEE;
    const isFeatured = Boolean(req.body.isFeatured) && listingFeePaid;

    const home = new Home({
      ...req.body,
      farmerId: decoded.id,
      isFeatured,
      listingFeePaid,
      listingFeeAmount: listingFeePaid ? HOME_PAGE_LISTING_FEE : 0,
    });

    // Store the posted crop in MongoDB.
    await home.save();

    // Return the newly created crop to the frontend.
    res.json(home);

  } catch (err) {
    console.error(err);

    // Missing token means the user needs to login first.
    if (err.statusCode === 401) {
      return res.status(401).json({ message: 'Please login before posting crops' });
    }

    // Invalid or expired token means the saved session is no longer usable.
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Fallback for unexpected backend/database errors.
    res.status(500).json({ message: 'Server error' });
  }
});

// Dealer views their own purchase history.
// This is protected so a dealer only sees purchases made by their account.
router.get('/purchases/mine', async (req, res) => {
  try {
    // Identify the logged-in user from the token.
    const decoded = getUserFromToken(req);

    // Farmers and admins should not use the dealer purchase history page.
    if (decoded.role !== 'dealer') {
      return res.status(403).json({ message: 'Only dealers can view purchases' });
    }

    // Find purchases by this dealer and include product/farmer details for display.
    const purchases = await Purchase.find({ dealerId: decoded.id })
      .populate('productId', 'name price image')
      .populate('farmerId', 'name email phone')
      .sort({ createdAt: -1 });

    // Send the dealer's purchases back to the frontend.
    res.json(purchases);
  } catch (err) {
    // Login/token problems should send the dealer back to login.
    if (err.statusCode === 401 || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Please login to view purchases' });
    }

    // Fallback for unexpected backend/database errors.
    res.status(500).json({ message: 'Server error' });
  }
});

// Public list of all crops posted by farmers.
// Dealers use this page to browse crops before purchasing.
router.get('/', async (req, res) => {
  // Support fetching only featured home-page products when requested.
  const filter = {};
  if (req.query.featured === 'true') {
    filter.isFeatured = true;
    filter.listingFeePaid = true;
  }

  // Include farmer contact fields so the product list/details can show who posted it.
  // Explicitly select _id along with other fields for frontend farmer ownership checks
  const homes = await Home.find(filter).populate('farmerId', '_id name email phone');
  res.json(homes);
});

// Dealer purchases a quantity from a farmer's posted crop.
// This route must appear before GET /:id, otherwise Express may treat "purchase" routes as generic ids.
// Security: Validates digital signature and token freshness for payment integrity
router.post('/:id/purchase', validateDigitalSignature, validateTokenFreshness, async (req, res) => {
  try {
    // Identify the logged-in dealer from the token.
    const decoded = getUserFromToken(req);

    // Only dealers can buy crops from farmer listings.
    if (decoded.role !== 'dealer') {
      return res.status(403).json({ message: 'Only dealers can purchase crops' });
    }

    // Convert the requested quantity to a number and validate it.
    const quantity = Number(req.body.quantity || 1);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const allowedPaymentMethods = ['card', 'mtn', 'orange'];
    const paymentMethod = req.body.paymentMethod;
    const accountName = String(req.body.accountName || '').trim();
    const paymentPhone = String(req.body.phone || '').trim();
    const deliveryAddress = String(req.body.deliveryAddress || '').trim();
    const deliveryDate = req.body.deliveryDate ? new Date(req.body.deliveryDate) : undefined;
    const trackingNote = String(req.body.trackingNote || '').trim();

    // Payment is recorded as a selected method only; real money transfer needs a payment provider.
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Choose card, MTN Mobile Money, or Orange Money' });
    }

    if (!accountName) {
      return res.status(400).json({ message: 'Account holder name is required' });
    }

    if ((paymentMethod === 'mtn' || paymentMethod === 'orange') && !paymentPhone) {
      return res.status(400).json({ message: 'Mobile money phone number is required' });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) {
      return res.status(400).json({ message: 'Delivery date is invalid' });
    }

    // Load the crop being purchased and the farmer who posted it.
    const product = await Home.findById(req.params.id).populate('farmerId', 'name email phone');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const recipientFarmer = product.farmerId;
    if (!recipientFarmer) {
      return res.status(400).json({ message: 'This crop has no farmer payment recipient' });
    }

    // The recipient is always the farmer attached to the crop, never a value sent by the dealer.
    // Prevent dealers from buying more than the farmer has available.
    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Not enough quantity available' });
    }

    // Reduce available stock after the purchase request is accepted.
    product.quantity -= quantity;
    await product.save();

    const unitPrice = Number(product.price) || 0;
    const amount = Number((unitPrice * quantity).toFixed(2));
    const linkFee = Number((amount * LINK_CHARGE_RATE).toFixed(2));
    const netAmount = Number((amount - linkFee).toFixed(2));
    const expectedSignature = createPaymentSignature({
      accountName,
      amount: amount.toString(),
      deliveryAddress,
      timestamp: Number(req.body.timestamp),
    }, getBearerToken(req));

    if (expectedSignature !== req.body.digitalSignature) {
      return res.status(400).json({ message: 'Payment authentication failed. Please refresh checkout and try again.' });
    }

    // Create a purchase record so both dealer and farmer can track it.
    const purchase = await Purchase.create({
      productId: product._id,
      farmerId: recipientFarmer._id,
      dealerId: decoded.id,
      quantity,
      amount,
      linkFee,
      netAmount,
      paymentMethod,
      accountName,
      paymentPhone,
      recipientName: recipientFarmer.name,
      recipientPhone: recipientFarmer.phone,
      deliveryAddress,
      deliveryDate,
      trackingNote,
      status: 'Pending'
    });

    // Return confirmation and the created purchase record.
    res.status(201).json({
      message: `Purchase request submitted. A 5% link charge of FCFA ${linkFee.toFixed(2)} has been applied. Payment is routed to ${recipientFarmer.name}.`,
      purchase,
      security: {
        signatureValidated: req.securePayment?.validated || false,
        tokenVerified: req.tokenValidated || false,
        timestamp: req.securePayment?.timestamp || null,
        encryptionStatus: 'HTTPS required in production',
      }
    });
  } catch (err) {
    // Login/token problems should send the dealer back to login.
    if (err.statusCode === 401 || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Please login before purchasing crops' });
    }

    // Fallback for unexpected backend/database errors.
    res.status(500).json({ message: 'Server error' });
  }
});

// View one crop in detail.
// This must stay after special routes like /:id/purchase.
router.get('/:id', async (req, res) => {
  // Include farmer contact details for the product detail page.
  // Explicitly select _id along with other fields for frontend farmer ownership checks
  const home = await Home.findById(req.params.id).populate('farmerId', '_id name email phone');
  res.json(home);
});

// Farmers can delete only their own crop listings.
router.delete('/:id', async (req, res) => {
  try {
    const decoded = getUserFromToken(req);

    if (decoded.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can delete crops' });
    }

    const deleted = await Home.findOneAndDelete({ _id: req.params.id, farmerId: decoded.id });

    if (!deleted) {
      return res.status(404).json({ message: 'Crop not found or you do not own this crop' });
    }

    res.json({ message: 'Crop deleted successfully' });
  } catch (err) {
    if (err.statusCode === 401 || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Please login before deleting crops' });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// Export this router so app.js can mount it at /api/products.
module.exports = router;
