/**
 * Centralized error handling middleware.
 * Catches all errors thrown or passed via next(err).
 *
 * Handles:
 * - Zod validation errors
 * - Prisma known request errors (unique constraint, not found, etc.)
 * - JSON syntax errors
 * - JWT errors
 * - Generic errors
 *
 * Never exposes stack traces, SQL details, or secrets to the client.
 */
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  // Log error server-side for debugging (never sent to client)
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // --- JSON Syntax Error (malformed request body) ---
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return sendError(res, {
      message: 'Invalid JSON in request body',
      statusCode: 400,
      code: 'INVALID_JSON',
    });
  }

  // --- Express body size limit exceeded ---
  if (err.type === 'entity.too.large') {
    return sendError(res, {
      message: 'Request body too large',
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  // --- Zod Validation Error ---
  if (err.name === 'ZodError') {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, {
      message: 'Validation failed',
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  // --- JWT Errors ---
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, {
      message: 'Invalid authentication token',
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, {
      message: 'Authentication token has expired',
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
    });
  }

  // --- Prisma Known Request Errors ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : target || 'field';
        return sendError(res, {
          message: `A record with this ${field} already exists`,
          statusCode: 409,
          code: 'DUPLICATE_ENTRY',
        });
      }
      case 'P2025':
        // Record not found
        return sendError(res, {
          message: 'The requested resource was not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        });
      case 'P2003':
        // Foreign key constraint violation
        return sendError(res, {
          message: 'Related resource not found',
          statusCode: 400,
          code: 'FOREIGN_KEY_ERROR',
        });
      default:
        return sendError(res, {
          message: 'A database error occurred',
          statusCode: 500,
          code: 'DATABASE_ERROR',
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, {
      message: 'Invalid data provided',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  // --- Application Errors with statusCode ---
  if (err.statusCode) {
    return sendError(res, {
      message: err.message || 'An error occurred',
      statusCode: err.statusCode,
      code: err.code || undefined,
    });
  }

  // --- Fallback: Internal Server Error ---
  return sendError(res, {
    message: 'Internal server error',
    statusCode: 500,
    code: 'INTERNAL_ERROR',
  });
}

