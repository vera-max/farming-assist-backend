const express = require('express');
const router = express.Router();
const { registerDealer, loginDealer } = require('../controllers/dealerController');

// Legacy dealer registration route.
// Current app.js does not mount this router; dealers use farmerRoutes.js with role="dealer".
router.post('/register', registerDealer);

// Legacy dealer login route.
router.post('/login', loginDealer);

module.exports = router;
