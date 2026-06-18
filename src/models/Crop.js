const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Legacy Sequelize model for crop reference data.
// Active farmer crop postings are stored in models/product.js.
// Crop model: stores crop info and farming tips
const Crop = sequelize.define('Crop', {
  cropId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // unique ID
  name: { type: DataTypes.STRING, allowNull: false }, // crop name
  season: { type: DataTypes.STRING }, // growing season
  tips: { type: DataTypes.TEXT } // farming tips
});

module.exports = Crop;
