const { vehicleTypes } = require('../config');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function isValidLicensePlate(plate) {
  return typeof plate === 'string' && plate.trim().length >= 3;
}

function isValidVehicleType(type) {
  return vehicleTypes.includes(type);
}

function normalizePlate(plate) {
  return plate.trim().toUpperCase().replace(/\s+/g, '');
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidLicensePlate,
  isValidVehicleType,
  normalizePlate
};
