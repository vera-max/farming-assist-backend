const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Legacy Sequelize model for dealer offers.
// Current dealer workflow purchases farmer-posted crops instead.
// Offer model: dealers post product offers
const Offer = sequelize.define('Offer', {
  offerId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // unique ID
  dealerId: { type: DataTypes.INTEGER, allowNull: false }, // dealer posting the offer
  product: { type: DataTypes.STRING, allowNull: false }, // product name
  price: { type: DataTypes.FLOAT, allowNull: false }, // product price
  availability: { type: DataTypes.STRING } // availability info
});

module.exports = Offer;
