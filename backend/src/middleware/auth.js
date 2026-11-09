/**
 * JWT Authentication middleware.
 * Verifies the token from Authorization header (Bearer) OR HttpOnly cookie
 * and attaches the authenticated user to req.user.
 */
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { sendError } from '../utils/response.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback to HttpOnly cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return sendError(res, {
        message: 'Authentication required',
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database to ensure they still exist and get current role
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return sendError(res, {
        message: 'User no longer exists',
        statusCode: 401,
        code: 'USER_NOT_FOUND',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, {
        message: 'Invalid authentication token',
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, {
        message: 'Authentication token has expired',
        statusCode: 401,
        code: 'TOKEN_EXPIRED',
      });
    }
    next(error);
  }
}
