/**
 * Public category routes.
 *
 * GET /api/categories         — List all active categories
 * GET /api/categories/:slug   — Get single category by slug
 */
import { Router } from 'express';
import { listCategories, getCategoryBySlug } from '../controllers/category.controller.js';
import { validate } from '../middleware/validate.js';
import { categorySlugParamSchema } from '../validators/category.validator.js';

const router = Router();

// List all active categories
router.get('/', listCategories);

// Get category by slug
router.get('/:slug', validate(categorySlugParamSchema, 'params'), getCategoryBySlug);

export default router;

