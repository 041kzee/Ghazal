/**
 * Standardized API response helpers for Ghazal Jewellery backend.
 * All responses follow a consistent JSON shape.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} options.message
 * @param {*} [options.data]
 * @param {number} [options.statusCode=200]
 * @param {object} [options.meta] - Pagination or extra metadata
 */
export function sendSuccess(res, { message, data = undefined, statusCode = 200, meta = undefined }) {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} options.message
 * @param {number} [options.statusCode=500]
 * @param {string} [options.code] - Optional machine-readable error code
 * @param {*} [options.errors] - Optional validation errors array
 */
export function sendError(res, { message, statusCode = 500, code = undefined, errors = undefined }) {
  const body = { success: false, message };
  if (code) body.code = code;
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

