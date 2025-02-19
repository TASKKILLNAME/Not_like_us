// middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error('User not found');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth;  // auth 미들웨어 export