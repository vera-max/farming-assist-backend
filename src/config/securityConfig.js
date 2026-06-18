// Security Configuration for Payment Processing
// Implement these settings for production deployment

module.exports = {
  // HTTPS Configuration
  https: {
    enabled: process.env.NODE_ENV === 'production',
    port: process.env.HTTPS_PORT || 443,
    // In production, set these from environment:
    // keyPath: process.env.SSL_KEY_PATH,
    // certPath: process.env.SSL_CERT_PATH,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '24h', // Token expires in 24 hours
    refreshTokenExpires: '7d', // Refresh token expires in 7 days
  },

  // CORS Configuration (Cross-Origin Resource Sharing)
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // Rate Limiting (prevent brute force attacks)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: false,
  },

  // Payment Security Headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  },

  // Payment Timeout (seconds)
  paymentTimeout: 30,

  // Maximum request body size (to prevent large payload attacks)
  maxRequestSize: '10kb',

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, // Prevent client-side JS from accessing the session cookie
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'strict', // Protect against CSRF attacks
  },

  // Production Deployment Checklist
  productionChecklist: [
    '✓ Set NODE_ENV=production',
    '✓ Enable HTTPS with valid SSL certificates',
    '✓ Set strong JWT_SECRET (minimum 32 characters)',
    '✓ Configure CORS_ORIGIN to your frontend domain',
    '✓ Enable rate limiting on API endpoints',
    '✓ Set secure=true for cookies in production',
    '✓ Enable HSTS (HTTP Strict Transport Security)',
    '✓ Implement database encryption at rest',
    '✓ Set up regular security audits and monitoring',
    '✓ Use environment variables for all secrets',
    '✓ Implement request logging and intrusion detection',
    '✓ Backup sensitive data regularly',
  ],
};
