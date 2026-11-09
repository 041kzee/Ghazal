/**
 * Customer Wishlist routes.
 * All routes require authentication.
 */
import { Router } from 'express';
import {
  getWishlist,
  addItem,
  removeItem,
} from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  addWishlistItemSchema,
  wishlistProductParamSchema,
} from '../validators/cart.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getWishlist);
router.post('/items', validate(addWishlistItemSchema), addItem);
router.delete('/items/:productId', validate(wishlistProductParamSchema, 'params'), removeItem);

export default router;

