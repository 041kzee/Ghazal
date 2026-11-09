/**
 * Zod validation middleware.
 * Validates request body, query, or params against a Zod schema.
 */
import { sendError } from '../utils/response.js';

/**
 * Create a validation middleware for the given Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body'] - Which part of the request to validate
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
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

    // Replace with parsed (and transformed) data
    if (source === 'query') {
      try {
        req.query = result.data;
      } catch {
        // Express 5 getter fallback: mutate object in place
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, result.data);
      }
      req.validatedQuery = result.data;
    } else if (source === 'params') {
      try {
        req.params = result.data;
      } catch {
        Object.assign(req.params, result.data);
      }
      req.validatedParams = result.data;
    } else {
      req[source] = result.data;
    }

    next();
  };
}
