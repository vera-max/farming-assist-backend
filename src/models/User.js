import mongoose from 'mongoose';

// Legacy generic user model.
// The active app currently uses the Farmer model for farmer/dealer/admin roles.
const userSchema = new mongoose.Schema({
  // User email used for login.
  email: { type: String, required: true, unique: true },

  // Hashed password.
  password: { type: String, required: true },

  // Role controls which dashboard/API actions are allowed.
  role: { type: String, enum: ['farmer', 'dealer', 'admin'], default: 'farmer' }
});

export default mongoose.model('User', userSchema);
