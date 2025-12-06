const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;

    // Check user status
    const user = await User.findById(decoded.id).select('status');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ 
        message: 'Sua conta foi bloqueada. Entre em contato com o suporte.',
        blocked: true 
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: 'Sua conta está suspensa temporariamente.',
        suspended: true 
      });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;

