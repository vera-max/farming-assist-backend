const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const { enforceSecureHeaders, validateDigitalSignature } = require('../middleware/paymentSecurity');

// Apply security headers to all payment routes
router.use(enforceSecureHeaders);

// Helper function to get user from token
const getUserFromToken = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    const err = new Error('No token provided');
    err.statusCode = 401;
    throw err;
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Process payment for listing fee (promoting crop to home page)
 * POST /api/payments/listing-fee
 * 
 * Request body:
 * {
 *   amount: number (e.g., 500 FCFA),
 *   paymentMethod: string ("mtn" or "orange"),
 *   phoneNumber: string (e.g., "+237XXXXXXXXX"),
 *   accountName: string,
 *   recipientAccount: string (e.g., "654904027"),
 *   cropData: object (crop details)
 * }
 */
router.post('/listing-fee', async (req, res) => {
  try {
    // Verify user is authenticated
    const user = getUserFromToken(req);

    // Only farmers can pay listing fees
    if (user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can pay listing fees',
      });
    }

    const {
      amount,
      paymentMethod,
      phoneNumber,
      accountName,
      recipientAccount,
    } = req.body;

    // Validate payment details
    if (!amount || !paymentMethod || !phoneNumber || !accountName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information',
      });
    }

    if (amount < 500) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payment amount is 500 FCFA',
      });
    }

    if (!['mtn', 'orange'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Use "mtn" or "orange"',
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^(\+237|237)?[0-9]{9}$/;
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
      });
    }

    // Check if farmer has sufficient balance
    const farmer = await Farmer.findById(user.id);
    
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer account not found',
      });
    }

    if (farmer.accountBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You have FCFA ${farmer.accountBalance}, but need FCFA ${amount}. Please add funds to your account.`,
        currentBalance: farmer.accountBalance,
        requiredAmount: amount,
        shortfall: amount - farmer.accountBalance,
      });
    }

    // Deduct amount from farmer's account balance
    farmer.accountBalance -= amount;
    await farmer.save();

    // Create payment record (for audit trail)
    const paymentData = {
      farmerId: user.id,
      amount,
      paymentMethod,
      phoneNumber: cleanPhone,
      accountName,
      recipientAccount,
      status: 'completed', // In production: pending -> completed after gateway confirmation
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Log payment for audit purposes (in production, store in database)
    console.log('Payment processed:', paymentData);

    // Return success response
    res.json({
      success: true,
      message: 'Payment processed successfully! Your crop will be featured on the home page.',
      transactionId: paymentData.transactionId,
      newBalance: farmer.accountBalance,
      paymentData,
    });

  } catch (err) {
    console.error('Payment processing error:', err);

    if (err.statusCode === 401 || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Please login to make payments',
      });
    }

    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Payment processing failed. Please try again.',
    });
  }
});

/**
 * Verify payment status (optional endpoint for checking payment status)
 * GET /api/payments/status/:transactionId
 */
router.get('/status/:transactionId', async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { transactionId } = req.params;

    // In production, fetch from database
    // For now, return a mock response
    res.json({
      success: true,
      transactionId,
      status: 'completed',
      message: 'Payment verified',
    });

  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Unable to verify payment status',
    });
  }
});

/**
 * Get farmer's current account balance
 * GET /api/payments/balance
 */
router.get('/balance', async (req, res) => {
  try {
    const user = getUserFromToken(req);

    if (user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can check balance',
      });
    }

    const farmer = await Farmer.findById(user.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer account not found',
      });
    }

    res.json({
      success: true,
      accountBalance: farmer.accountBalance,
      farmerId: farmer._id,
    });

  } catch (err) {
    console.error('Balance check error:', err);

    if (err.statusCode === 401 || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Please login to check balance',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Unable to check balance',
    });
  }
});

/**
 * Add funds to farmer's account balance
 * POST /api/payments/add-funds
 * 
 * Request body:
 * {
 *   amount: number (amount to add to balance)
 * }
 */
router.post('/add-funds', async (req, res) => {
  try {
    const user = getUserFromToken(req);

    if (user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can add funds',
      });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum single transfer amount is 1,000,000 FCFA',
      });
    }

    const farmer = await Farmer.findById(user.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer account not found',
      });
    }

    // Add funds to account
    farmer.accountBalance += amount;
    await farmer.save();

    res.json({
      success: true,
      message: `Successfully added FCFA ${amount} to your account`,
      newBalance: farmer.accountBalance,
      amountAdded: amount,
    });

  } catch (err) {
    console.error('Add funds error:', err);

    if (err.statusCode === 401 || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Please login to add funds',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add funds',
    });
  }
});

module.exports = router;
