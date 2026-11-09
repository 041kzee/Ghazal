/**
 * Customer Order routes.
 * All routes require authentication.
 */
import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createOrderSchema,
  orderIdParamSchema,
  orderQuerySchema,
} from '../validators/order.validator.js';

const router = Router();

router.use(authenticate);

// Place new order
router.post('/', validate(createOrderSchema), createOrder);

// List customer orders
router.get('/my-orders', validate(orderQuerySchema, 'query'), getMyOrders);

// Get single order details
router.get('/:id', validate(orderIdParamSchema, 'params'), getOrderById);

// Cancel order
router.post('/:id/cancel', validate(orderIdParamSchema, 'params'), cancelOrder);

export default router;

