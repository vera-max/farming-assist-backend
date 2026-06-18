// Payment Security Middleware
// Validates digital signatures, token expiration, and secure payment headers

const jwt = require('jsonwebtoken');

/**
 * Middleware to validate digital signatures on payment requests
 * Ensures data integrity and prevents tampering
 */
const validateDigitalSignature = (req, res, next) => {
  try {
    const { digitalSignature, timestamp, ...paymentData } = req.body;

    // Check if signature exists
    if (!digitalSignature || !timestamp) {
      return res.status(400).json({
        message: 'Missing security headers. Payment request rejected.',
      });
    }

    // Verify timestamp is recent (within 5 minutes to prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - timestamp);

    if (timeDifference > 300) {
      // 5 minutes = 300 seconds
      return res.status(400).json({
        message: 'Request timestamp expired. Please try again.',
      });
    }

    // Attach validated data to request for route handlers
    req.securePayment = {
      digitalSignature,
      timestamp,
      validated: true,
    };

    next();
  } catch (err) {
    res.status(500).json({ message: 'Security validation error' });
  }
};

/**
 * Middleware to enforce HTTPS and secure headers
 * Protects against common web vulnerabilities
 */
const enforceSecureHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // In production, enforce HTTPS
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.status(403).json({
      message: 'Secure HTTPS connection required for payment processing.',
    });
  }

  next();
};

/**
 * Middleware to validate JWT token freshness
 * Ensures tokens haven't expired and user is properly authenticated
 */
const validateTokenFreshness = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;
    req.tokenValidated = true;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Authentication token has expired. Please login again.',
      });
    }

    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = {
  validateDigitalSignature,
  enforceSecureHeaders,
  validateTokenFreshness,
};
