/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticate middleware.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('ADMIN'), handler);
 *   router.get('/multi-role', authenticate, authorize('ADMIN', 'CUSTOMER'), handler);
 */
import { sendError } from '../utils/response.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        message: 'Authentication required',
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        message: 'You do not have permission to access this resource',
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

