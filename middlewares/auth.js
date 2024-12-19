const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

exports.authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Token gerekli.' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Geçersiz token.' });
  }
};

// Yetki kontrolü middleware
exports.authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
  }
  next();
};