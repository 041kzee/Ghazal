/**
 * Wishlist controller — HTTP handlers for customer wishlist management.
 */
import * as wishlistService from '../services/wishlist.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/wishlist
 */
export async function getWishlist(req, res, next) {
  try {
    const wishlist = await wishlistService.getWishlist(req.user.id);
    return sendSuccess(res, {
      message: 'Wishlist fetched successfully',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/wishlist/items
 */
export async function addItem(req, res, next) {
  try {
    const { product_id } = req.body;
    const wishlist = await wishlistService.addToWishlist(req.user.id, product_id);
    return sendSuccess(res, {
      message: 'Product added to wishlist',
      data: wishlist,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/wishlist/items/:productId
 */
export async function removeItem(req, res, next) {
  try {
    const wishlist = await wishlistService.removeFromWishlist(req.user.id, req.params.productId);
    return sendSuccess(res, {
      message: 'Product removed from wishlist',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
}

