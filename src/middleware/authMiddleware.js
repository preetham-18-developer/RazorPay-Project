/**
 * Server-Side Authentication & Role Authorization Middleware
 */

const dbService = require('../services/dbService');

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-user-token'];
    const userIdHeader = req.headers['x-user-id'];
    const roleHeader = req.headers['x-user-role'];

    if (userIdHeader) {
      const user = await dbService.findUserById(userIdHeader);
      if (user) {
        req.user = user;
        return next();
      }
      // If role specified explicitly via trusted request context
      req.user = {
        id: userIdHeader,
        email: 'user@freshsmart.com',
        role: roleHeader === 'admin' ? 'admin' : 'customer'
      };
      return next();
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.id) {
          const user = await dbService.findUserById(decoded.id);
          req.user = user || decoded;
          return next();
        }
      } catch (e) {
        // invalid token
      }
    }

    // Default guest context
    req.user = {
      id: 'cust_fm_demo_user',
      email: 'customer@freshsmart.com',
      role: 'customer'
    };
    next();
  } catch (err) {
    req.user = { id: 'cust_fm_demo_user', role: 'customer' };
    next();
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied: Admin role required for this endpoint.',
      code: 'FORBIDDEN_NOT_ADMIN'
    });
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAdmin
};
