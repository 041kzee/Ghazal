/**
 * Customer Shopping Cart routes.
 * All routes require authentication.
 */
import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemIdParamSchema,
} from '../validators/cart.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getCart);
router.post('/items', validate(addCartItemSchema), addItem);
router.patch('/items/:id', validate(cartItemIdParamSchema, 'params'), validate(updateCartItemSchema), updateItem);
router.delete('/items/:id', validate(cartItemIdParamSchema, 'params'), removeItem);
router.delete('/', clearCart);

export default router;

