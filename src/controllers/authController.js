import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js'; // Mongoose User model

// Generate a JWT that includes the user's MongoDB id and role.
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },   // ✅ use _id for MongoDB
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Legacy login route for the generic User model.
// The active frontend currently logs in through routes/farmerRoutes.js.
export const loginFarmer = async (req, res) => {
  const { email, password } = req.body;

  try {
    //  MongoDB query
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Compare the submitted password against the stored hash.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    //  Generate JWT
    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
