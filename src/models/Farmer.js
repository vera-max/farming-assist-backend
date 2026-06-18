const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Define Farmer schema

// Define Farmer schema
const FarmerSchema = new mongoose.Schema({
  farmerId: {
    type: String,
    default: uuidv4, // auto‑generate UUID
    unique: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: { type: String },
  role: { type: String, enum: ['farmer', 'dealer', 'admin'], default: 'farmer' },
  accountBalance: { type: Number, default: 0 } // Balance in FCFA for payment processing
}, { timestamps: true });

// Hash password before saving
FarmerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (err) {
    console.error('Password hashing failed:', err.message);
    throw err;
  }
});




// Export Farmer model
module.exports = mongoose.model('Farmer', FarmerSchema);