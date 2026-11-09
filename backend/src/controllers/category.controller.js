/**
 * Category controller — handles HTTP requests and responses.
 */
import * as categoryService from '../services/category.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/categories
 * List all active categories (public).
 */
export async function listCategories(req, res, next) {
  try {
    const categories = await categoryService.getAllCategories();
    return sendSuccess(res, {
      message: 'Categories fetched successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/categories/:slug
 * Get a single category by slug (public).
 */
export async function getCategoryBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const category = await categoryService.getCategoryBySlug(slug);

    if (!category) {
      return sendError(res, {
        message: 'Category not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    return sendSuccess(res, {
      message: 'Category fetched successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/categories
 * List all categories including inactive (admin).
 */
export async function listCategoriesAdmin(req, res, next) {
  try {
    const categories = await categoryService.getAllCategoriesAdmin();
    return sendSuccess(res, {
      message: 'All categories fetched successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/categories
 * Create a new category (admin).
 */
export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    return sendSuccess(res, {
      message: 'Category created successfully',
      data: category,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/categories/:id
 * Update an existing category (admin).
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(id, req.body);
    return sendSuccess(res, {
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/categories/:id
 * Delete or deactivate a category (admin).
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(id);
    return sendSuccess(res, {
      message: result.message,
      data: { action: result.action },
    });
  } catch (error) {
    next(error);
  }
}

