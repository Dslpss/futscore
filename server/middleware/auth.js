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

    // Get full user for routes that need it
    const user = await User.findById(decoded.id).select('name email status');
    
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

    // Add user to request for use in routes
    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Export both as default and named export for compatibility
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;

