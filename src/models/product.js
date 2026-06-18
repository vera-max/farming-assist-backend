const mongoose = require('mongoose');

// Product/crop listing posted by a farmer.
const homeSchema = new mongoose.Schema({
  // Crop name shown to dealers.
  name: String,

  // Farmer's description of the crop.
  description: String,

  // Unit price entered by the farmer.
  price: Number,

  // Available quantity. Dealer purchases reduce this value.
  quantity: Number,

  // Crop image stored as a URL or base64 data URL.
  image: String,

  // Whether the farmer paid a small listing fee to promote this crop to the home page.
  isFeatured: { type: Boolean, default: false },
  listingFeePaid: { type: Boolean, default: false },
  listingFeeAmount: { type: Number, default: 0 },

  // Farmer account that posted the crop.
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
}, { timestamps: true });

// Existing app code calls this model Home, even though it represents crop products.
module.exports = mongoose.model('Home', homeSchema);
