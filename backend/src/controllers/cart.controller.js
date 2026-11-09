/**
 * Cart controller — HTTP handlers for customer cart management.
 */
import * as cartService from '../services/cart.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/cart
 */
export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.id);
    return sendSuccess(res, {
      message: 'Cart fetched successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cart/items
 */
export async function addItem(req, res, next) {
  try {
    const { variant_id, quantity } = req.body;
    const cart = await cartService.addItemToCart(req.user.id, variant_id, quantity);
    return sendSuccess(res, {
      message: 'Item added to cart',
      data: cart,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/cart/items/:id
 */
export async function updateItem(req, res, next) {
  try {
    const { quantity } = req.body;
    const cart = await cartService.updateCartItemQuantity(req.user.id, req.params.id, quantity);
    return sendSuccess(res, {
      message: 'Cart item updated',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/cart/items/:id
 */
export async function removeItem(req, res, next) {
  try {
    const cart = await cartService.removeCartItem(req.user.id, req.params.id);
    return sendSuccess(res, {
      message: 'Item removed from cart',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/cart
 */
export async function clearCart(req, res, next) {
  try {
    const cart = await cartService.clearCart(req.user.id);
    return sendSuccess(res, {
      message: 'Cart cleared successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

