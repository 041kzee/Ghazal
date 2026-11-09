/**
 * Admin routes — aggregates all admin-only endpoints.
 * All routes under /api/admin require authentication + ADMIN role.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

// Category imports
import {
  listCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../validators/category.validator.js';

// Product imports
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  addVariant,
  updateVariant,
  deleteVariant,
  addImage,
  deleteImage,
} from '../controllers/product.controller.js';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  toggleAvailabilitySchema,
  createVariantSchema,
  updateVariantSchema,
  variantParamSchema,
  addImageSchema,
  imageParamSchema,
} from '../validators/product.validator.js';

// Order imports
import {
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
} from '../controllers/order.controller.js';
import {
  orderQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from '../validators/order.validator.js';

// Dashboard & Customers imports
import {
  getDashboardSummary,
  getRecentOrders,
  getLowStock,
  getCustomers,
  getAdminProducts,
} from '../controllers/admin.controller.js';

const router = Router();

// All admin routes strictly require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ─── Dashboard & Analytics ──────────────────────────────────────
router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/recent-orders', getRecentOrders);
router.get('/dashboard/low-stock', getLowStock);
router.get('/customers', getCustomers);

// ─── Admin Product Management (includes inactive) ───────────────
router.get('/products', getAdminProducts);
router.post('/products', validate(createProductSchema), createProduct);
router.patch('/products/:id', validate(productIdParamSchema, 'params'), validate(updateProductSchema), updateProduct);
router.delete('/products/:id', validate(productIdParamSchema, 'params'), deleteProduct);
router.patch('/products/:id/availability', validate(productIdParamSchema, 'params'), validate(toggleAvailabilitySchema), toggleProductAvailability);

// Product Variants
router.post('/products/:id/variants', validate(productIdParamSchema, 'params'), validate(createVariantSchema), addVariant);
router.patch('/products/:id/variants/:variantId', validate(variantParamSchema, 'params'), validate(updateVariantSchema), updateVariant);
router.delete('/products/:id/variants/:variantId', validate(variantParamSchema, 'params'), deleteVariant);

// Product Images
router.post('/products/:id/images', validate(productIdParamSchema, 'params'), validate(addImageSchema), addImage);
router.delete('/products/:id/images/:imageId', validate(imageParamSchema, 'params'), deleteImage);

// ─── Admin Category Management (includes inactive) ──────────────
router.get('/categories', listCategoriesAdmin);
router.post('/categories', validate(createCategorySchema), createCategory);
router.patch('/categories/:id', validate(categoryIdParamSchema, 'params'), validate(updateCategorySchema), updateCategory);
router.delete('/categories/:id', validate(categoryIdParamSchema, 'params'), deleteCategory);

// ─── Admin Order Management ─────────────────────────────────────
router.get('/orders', validate(orderQuerySchema, 'query'), getAdminOrders);
router.get('/orders/:id', validate(orderIdParamSchema, 'params'), getAdminOrderById);
router.patch('/orders/:id/status', validate(orderIdParamSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
