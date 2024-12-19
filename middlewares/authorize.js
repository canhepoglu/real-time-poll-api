const authorize = (roles = []) => {
    // Tek bir rol geçilirse array'e çevir
    if (typeof roles === 'string') {
      roles = [roles];
    }
  
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
      }
      next();
    };
  };
  
  module.exports = authorize;