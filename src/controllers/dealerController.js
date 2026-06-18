const Dealer = require('../models/Dealer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Legacy dealer registration using the Sequelize Dealer model.
// The active app currently registers dealers through the Farmer model with role="dealer".
exports.registerDealer = async (req, res) => {
  try {
    const { name, phone, location, password } = req.body;

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create dealer record
    const dealer = await Dealer.create({ name, phone, location, password: hashedPassword });

    res.status(201).json({ message: 'Dealer registered successfully', dealer });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

// Legacy dealer login by phone number.
exports.loginDealer = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find dealer by phone
    const dealer = await Dealer.findOne({ where: { phone } });
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    // Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, dealer.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Generate JWT token for the dealer.
    const token = jwt.sign({ id: dealer.dealerId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};
