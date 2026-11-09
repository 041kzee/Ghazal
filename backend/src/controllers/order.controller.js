/**
 * Order controller — HTTP handlers for customer and admin order operations.
 */
import * as orderService from '../services/order.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/orders
 * Authenticated customer: create new order (checkout).
 */
export async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Order placed successfully',
      data: order,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders/my-orders
 * Authenticated customer: list my orders with pagination.
 */
export async function getMyOrders(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { items, meta } = await orderService.getMyOrders(req.user.id, query);
    return sendSuccess(res, {
      message: 'Orders fetched successfully',
      data: items,
      meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders/:id
 * Authenticated customer: get my order details.
 */
export async function getOrderById(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user.id, false);
    return sendSuccess(res, {
      message: 'Order fetched successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/orders/:id/cancel
 * Authenticated customer: cancel pending order.
 */
export async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelCustomerOrder(req.params.id, req.user.id);
    return sendSuccess(res, {
      message: 'Order cancelled successfully and inventory restored',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/orders
 * Admin: list all orders.
 */
export async function getAdminOrders(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { items, meta } = await orderService.getAdminOrders(query);
    return sendSuccess(res, {
      message: 'Orders fetched successfully',
      data: items,
      meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/orders/:id
 * Admin: get full details for any order.
 */
export async function getAdminOrderById(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user.id, true);
    return sendSuccess(res, {
      message: 'Order fetched successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/orders/:id/status
 * Admin: update order status.
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const order = await orderService.updateOrderStatusAdmin(req.params.id, req.body.status);
    return sendSuccess(res, {
      message: `Order status updated to ${req.body.status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

