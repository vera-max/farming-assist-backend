const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Legacy Sequelize model.
// The active MongoDB flow stores admin users in the Farmer model with role="admin".
// Admin model: represents system administrators
const Admin = sequelize.define('Admin', {
  adminId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // unique ID
  username: { type: DataTypes.STRING, allowNull: false }, // login username
  password: { type: DataTypes.STRING, allowNull: false } // hashed password
});

module.exports = Admin;
