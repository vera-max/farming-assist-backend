const mongoose = require('mongoose');

// Purchase request created when a dealer buys from a farmer's crop listing.
const PurchaseSchema = new mongoose.Schema({
  // Crop/product being purchased.
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Home', required: true },

  // Farmer who owns the crop listing.
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

  // Dealer account that requested the purchase.
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

  // Quantity requested by the dealer.
  quantity: { type: Number, required: true, min: 1 },

  // Total amount for this purchase before the 5% platform fee.
  amount: { type: Number, required: true },

  // The 5% link charge deducted from the transaction.
  linkFee: { type: Number, required: true },

  // Amount the farmer should receive after the platform fee.
  netAmount: { type: Number, required: true },

  // Payment option selected during checkout.
  paymentMethod: {
    type: String,
    enum: ['card', 'mtn', 'orange'],
    required: true
  },

  // Name entered on the payment/account details form.
  accountName: { type: String, required: true, trim: true },

  // Mobile money number when the dealer pays with MTN or Orange.
  paymentPhone: { type: String, trim: true },

  // Farmer account that receives the payment for this crop.
  // These are copied from the crop owner at purchase time for easier history display.
  recipientName: { type: String, required: true, trim: true },
  recipientPhone: { type: String, required: true, trim: true },

  // Delivery details entered by the dealer and updated by the farmer.
  // The farmer can later update the date/note/status from the delivery tracking page.
  deliveryAddress: { type: String, required: true, trim: true },
  deliveryDate: { type: Date },
  trackingNote: { type: String, trim: true },

  // Purchase/delivery workflow status.
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Transit', 'Delivered', 'Completed', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', PurchaseSchema);
