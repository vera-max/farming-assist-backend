const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Legacy Sequelize model.
// The active MongoDB complaint model is FarmerComplaint.
// Complaint model: farmers submit grievances
const Complaint = sequelize.define('Complaint', {
  complaintId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // unique ID
  farmerId: { type: DataTypes.INTEGER, allowNull: false }, // farmer who submitted
  description: { type: DataTypes.TEXT, allowNull: false }, // complaint details
  status: { type: DataTypes.STRING, defaultValue: 'Pending' } // complaint status
});

module.exports = Complaint;
