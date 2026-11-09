/**
 * Product controller — HTTP handlers for public and admin product APIs.
 */
import * as productService from '../services/product.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/products
 * Public: list products with pagination, search, filtering, and sorting.
 */
export async function listProducts(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { items, meta } = await productService.getPublicProducts(query);
    return sendSuccess(res, {
      message: 'Products fetched successfully',
      data: items,
      meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/featured
 * Public: list featured products.
 */
export async function getFeaturedProducts(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 8;
    const products = await productService.getFeaturedProducts(limit);
    return sendSuccess(res, {
      message: 'Featured products fetched successfully',
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:id
 * Public: get single active product by ID.
 */
export async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return sendError(res, {
        message: 'Product not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return sendSuccess(res, {
      message: 'Product fetched successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/slug/:slug
 * Public: get single active product by Slug.
 */
export async function getProductBySlug(req, res, next) {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    if (!product) {
      return sendError(res, {
        message: 'Product not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return sendSuccess(res, {
      message: 'Product fetched successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/products
 * Admin: Create product with optional variants and images.
 */
export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    return sendSuccess(res, {
      message: 'Product created successfully',
      data: product,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/products/:id
 * Admin: Update product details.
 */
export async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/products/:id
 * Admin: Delete or safely deactivate product.
 */
export async function deleteProduct(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    return sendSuccess(res, {
      message: result.message,
      data: { action: result.action },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/products/:id/availability
 * Admin: Toggle product active availability.
 */
export async function toggleProductAvailability(req, res, next) {
  try {
    const updated = await productService.toggleProductAvailability(req.params.id, req.body.is_active);
    return sendSuccess(res, {
      message: `Product availability updated to ${req.body.is_active ? 'active' : 'inactive'}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/products/:id/variants
 * Admin: Add variant.
 */
export async function addVariant(req, res, next) {
  try {
    const variant = await productService.addVariant(req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Variant created successfully',
      data: variant,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/products/:id/variants/:variantId
 * Admin: Update variant.
 */
export async function updateVariant(req, res, next) {
  try {
    const variant = await productService.updateVariant(req.params.id, req.params.variantId, req.body);
    return sendSuccess(res, {
      message: 'Variant updated successfully',
      data: variant,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/products/:id/variants/:variantId
 * Admin: Delete variant.
 */
export async function deleteVariant(req, res, next) {
  try {
    const result = await productService.deleteVariant(req.params.id, req.params.variantId);
    return sendSuccess(res, {
      message: result.message,
      data: { action: result.action },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/products/:id/images
 * Admin: Add image.
 */
export async function addImage(req, res, next) {
  try {
    const image = await productService.addImage(req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Image added successfully',
      data: image,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/products/:id/images/:imageId
 * Admin: Delete image.
 */
export async function deleteImage(req, res, next) {
  try {
    const result = await productService.deleteImage(req.params.id, req.params.imageId);
    return sendSuccess(res, {
      message: result.message,
      data: { action: result.action },
    });
  } catch (error) {
    next(error);
  }
}
