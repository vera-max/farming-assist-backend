const mongoose = require('mongoose');

// Complaint submitted by a farmer and reviewed by admins.
const FarmerComplaintSchema = new mongoose.Schema({
  // Farmer who submitted the complaint.
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },

  // Optional complaint category chosen/typed by the farmer.
  category: { type: String },

  // Main complaint text.
  description: { type: String, required: true },

  // Admin workflow status.
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('FarmerComplaint', FarmerComplaintSchema);
