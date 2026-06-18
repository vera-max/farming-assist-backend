const express = require('express');
const router = express.Router();
const { registerFarmer, loginFarmer } = require('../controllers/authController');

// Legacy auth route for registration.
// Current app.js does not mount this router; active auth is in farmerRoutes.js.
router.post('/register', registerFarmer);

// Legacy auth route for login.
router.post('/login', loginFarmer);

module.exports = router;
