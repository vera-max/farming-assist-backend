const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Legacy Sequelize model.
// The active MongoDB flow stores dealer users in the Farmer model with role="dealer".
// Dealer model: represents suppliers/dealers in the system
const Dealer = sequelize.define('Dealer', {
  dealerId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // unique ID
  name: { type: DataTypes.STRING, allowNull: false }, // dealer name
  phone: { type: DataTypes.STRING, allowNull: false }, // contact phone
  location: { type: DataTypes.STRING }, // dealer location
  password: { type: DataTypes.STRING, allowNull: false } // hashed password
});

module.exports = Dealer;
