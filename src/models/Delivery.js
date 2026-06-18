const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Legacy Sequelize model.
// Active delivery/purchase tracking is stored in the Purchase MongoDB model.
// Delivery model: tracks product deliveries between farmers and dealers
const Delivery = sequelize.define('Delivery', {
  deliveryId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // unique ID
  farmerId: { type: DataTypes.INTEGER, allowNull: false }, // farmer receiving delivery
  dealerId: { type: DataTypes.INTEGER, allowNull: false }, // dealer sending delivery
  product: { type: DataTypes.STRING, allowNull: false }, // product being delivered
  status: { type: DataTypes.STRING, defaultValue: 'Pending' } // delivery status
});

module.exports = Delivery;
