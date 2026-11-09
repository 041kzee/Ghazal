/**
 * Pagination utility for consistent collection responses.
 */

/**
 * Parse pagination parameters from query string.
 * @param {object} query - Express req.query
 * @param {object} [defaults]
 * @param {number} [defaults.page=1]
 * @param {number} [defaults.limit=20]
 * @param {number} [defaults.maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination(query, defaults = {}) {
  const { page: defaultPage = 1, limit: defaultLimit = 20, maxLimit = 100 } = defaults;

  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) page = defaultPage;

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination metadata for a response.
 * @param {number} total - Total number of records
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
export function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

