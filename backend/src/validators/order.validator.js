/**
 * Zod validation schemas for Order endpoints.
 */
import { z } from 'zod';

const uuid = z.string().uuid('Invalid UUID format');

// Shipping address snapshot schema
export const shippingAddressSchema = z.object({
  full_name: z.string().min(2).max(150).trim(),
  phone: z.string().min(10).max(20).trim(),
  address_line1: z.string().min(3).max(500).trim(),
  address_line2: z.string().max(500).trim().optional().nullable(),
  city: z.string().min(2).max(100).trim(),
  state: z.string().min(2).max(100).trim(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Valid 6-digit Indian PIN code required').trim(),
  country: z.string().max(100).trim().optional().default('India'),
});

// Create order schema
export const createOrderSchema = z
  .object({
    address_id: uuid.optional(),
    shipping_address: shippingAddressSchema.optional(),
    use_cart: z.boolean().optional().default(true),
    items: z
      .array(
        z.object({
          variant_id: uuid,
          quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
        })
      )
      .optional(),
    payment_method: z.string().max(50).trim().optional().default('ONLINE'),
  })
  .refine((data) => data.address_id || data.shipping_address, {
    message: 'Either address_id or shipping_address must be provided',
    path: ['address_id'],
  })
  .refine((data) => data.use_cart || (Array.isArray(data.items) && data.items.length > 0), {
    message: 'Either use_cart must be true or an array of items must be provided',
    path: ['items'],
  });

// Admin update order status schema
export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

// Admin order list query schema
export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  search: z.string().trim().optional(), // order number or customer email
});

export const orderIdParamSchema = z.object({
  id: uuid,
});

