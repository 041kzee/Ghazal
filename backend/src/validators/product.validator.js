/**
 * Zod validation schemas for Product, Variant, and Product Image endpoints.
 */
import { z } from 'zod';

// UUID validation helper
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Query params for public product listing
export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(), // Can be category_id (UUID) or category slug
  material: z.string().trim().optional(),
  min_price: z.coerce.number().int().nonnegative().optional(), // in paise or rupees (we normalize to paise)
  max_price: z.coerce.number().int().positive().optional(),
  in_stock: z
    .enum(['true', 'false', '1', '0'])
    .transform((val) => val === 'true' || val === '1')
    .optional(),
  sort_by: z.enum(['price_asc', 'price_desc', 'newest', 'oldest', 'name_asc', 'name_desc']).optional().default('newest'),
  is_featured: z
    .enum(['true', 'false', '1', '0'])
    .transform((val) => val === 'true' || val === '1')
    .optional(),
});

// Admin create variant schema
export const createVariantSchema = z.object({
  sku: z.string().min(1, 'Variant SKU is required').max(100).trim(),
  size: z.string().max(50).trim().optional().nullable(),
  material: z.string().max(100).trim().optional().nullable(),
  color: z.string().max(50).trim().optional().nullable(),
  weight_grams: z.coerce.number().positive('Weight must be positive').optional().nullable(),
  price_paise: z.coerce.number().int().nonnegative('Price in paise cannot be negative'),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative').optional().default(0),
  is_active: z.boolean().optional().default(true),
});

// Admin update variant schema
export const updateVariantSchema = z.object({
  sku: z.string().min(1).max(100).trim().optional(),
  size: z.string().max(50).trim().optional().nullable(),
  material: z.string().max(100).trim().optional().nullable(),
  color: z.string().max(50).trim().optional().nullable(),
  weight_grams: z.coerce.number().positive().optional().nullable(),
  price_paise: z.coerce.number().int().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for variant update',
});

// Image schema
export const addImageSchema = z.object({
  image_url: z.string().url('Must be a valid image URL'),
  alt_text: z.string().max(255).trim().optional().nullable(),
  is_primary: z.boolean().optional().default(false),
  display_order: z.coerce.number().int().optional().default(0),
});

// Admin create product schema
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200).trim(),
  slug: z
    .string()
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(5000).trim().optional().nullable(),
  sku: z.string().min(1, 'Product SKU is required').max(100).trim(),
  material: z.string().max(100).trim().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  category_id: uuidSchema,
  variants: z.array(createVariantSchema).optional().default([]),
  images: z.array(addImageSchema).optional().default([]),
});

// Admin update product schema
export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  slug: z
    .string()
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(5000).trim().optional().nullable(),
  sku: z.string().min(1).max(100).trim().optional(),
  material: z.string().max(100).trim().optional().nullable(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  category_id: uuidSchema.optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Availability toggle schema
export const toggleAvailabilitySchema = z.object({
  is_active: z.boolean(),
});

// Param validation
export const productIdParamSchema = z.object({
  id: uuidSchema,
});

export const productSlugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

export const variantParamSchema = z.object({
  id: uuidSchema,
  variantId: uuidSchema,
});

export const imageParamSchema = z.object({
  id: uuidSchema,
  imageId: uuidSchema,
});

