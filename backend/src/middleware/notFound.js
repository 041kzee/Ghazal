/**
 * 404 Not Found handler.
 * Catches all requests that don't match any defined route.
 */
import { sendError } from '../utils/response.js';

export function notFoundHandler(req, res, _next) {
  return sendError(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
  });
}

