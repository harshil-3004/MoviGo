const mongoose = require('mongoose');
const Theater = require('../models/Theater');

const isAdminRole = (role) => role === 'admin' || role === 'master_admin';

const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  const minLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_]/.test(password);
  const hasAlphabet = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return minLength && hasUppercase && hasSymbol && hasAlphabet && hasNumber;
};

const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 6 characters, contain 1 uppercase letter, 1 unique symbol, and 1 number.';

const getAuthorizedTheaterIds = async (userId, theaterIds = []) => {
  const assignedIds = (theaterIds || [])
    .filter(Boolean)
    .map((id) => id.toString());

  let ownedIds = [];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    const ownedTheaters = await Theater.find({
      requestedBy: new mongoose.Types.ObjectId(userId),
    }).select('_id');
    ownedIds = ownedTheaters.map((t) => t._id.toString());
  }

  const stringIds = [...new Set([...assignedIds, ...ownedIds])];
  const objectIds = stringIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return { stringIds, objectIds };
};

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  obj.id = (obj._id || obj.id)?.toString();
  return obj;
};

module.exports = {
  isAdminRole,
  validatePassword,
  PASSWORD_POLICY_MESSAGE,
  getAuthorizedTheaterIds,
  sanitizeUser,
};
