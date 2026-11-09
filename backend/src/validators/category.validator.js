/**
 * Zod validation schemas for Category endpoints.
 */
import { z } from 'zod';

// Schema for creating a new category
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be 100 characters or less')
    .trim(),
  slug: z
    .string()
    .max(120, 'Slug must be 120 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional()
    .nullable(),
  image_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .nullable(),
  is_active: z
    .boolean()
    .optional()
    .default(true),
});

// Schema for updating a category (all fields optional)
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be 100 characters or less')
    .trim()
    .optional(),
  slug: z
    .string()
    .max(120, 'Slug must be 120 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional()
    .nullable(),
  image_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .nullable(),
  is_active: z
    .boolean()
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Schema for validating UUID params
export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID format'),
});

// Schema for validating slug params
export const categorySlugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

