/**
 * Zod validation schemas for Cart and Wishlist endpoints.
 */
import { z } from 'zod';

const uuid = z.string().uuid('Invalid UUID format');

// Cart validations
export const addCartItemSchema = z.object({
  variant_id: uuid,
  quantity: z.coerce.number().int().positive('Quantity must be at least 1').optional().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
});

export const cartItemIdParamSchema = z.object({
  id: uuid,
});

// Wishlist validations
export const addWishlistItemSchema = z.object({
  product_id: uuid,
});

export const wishlistProductParamSchema = z.object({
  productId: uuid,
});

