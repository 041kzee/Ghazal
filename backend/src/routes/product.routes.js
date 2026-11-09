/**
 * Public Product Routes.
 *
 * GET /api/products           — List products with search, filter, sort, pagination
 * GET /api/products/featured  — List featured products
 * GET /api/products/slug/:slug — Get product by slug
 * GET /api/products/:id       — Get product by ID
 */
import { Router } from 'express';
import {
  listProducts,
  getFeaturedProducts,
  getProductBySlug,
  getProductById,
} from '../controllers/product.controller.js';
import { validate } from '../middleware/validate.js';
import {
  productQuerySchema,
  productSlugParamSchema,
  productIdParamSchema,
} from '../validators/product.validator.js';

const router = Router();

// Public: list products
router.get('/', validate(productQuerySchema, 'query'), listProducts);

// Public: featured products
router.get('/featured', getFeaturedProducts);

// Public: get by slug
router.get('/slug/:slug', validate(productSlugParamSchema, 'params'), getProductBySlug);

// Public: get by id
router.get('/:id', validate(productIdParamSchema, 'params'), getProductById);

export default router;

