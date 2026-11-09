/**
 * Zod validation schemas for Customer Address endpoints.
 */
import { z } from 'zod';

export const addressIdParamSchema = z.object({
  id: z.string().uuid('Invalid address ID format'),
});

export const createAddressSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(150)
    .trim(),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20)
    .trim(),
  address_line1: z
    .string()
    .min(3, 'Address line 1 is required')
    .max(500)
    .trim(),
  address_line2: z
    .string()
    .max(500)
    .trim()
    .optional()
    .nullable(),
  city: z
    .string()
    .min(2, 'City is required')
    .max(100)
    .trim(),
  state: z
    .string()
    .min(2, 'State is required')
    .max(100)
    .trim(),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code')
    .trim(),
  country: z
    .string()
    .max(100)
    .trim()
    .optional()
    .default('India'),
  is_default: z
    .boolean()
    .optional()
    .default(false),
});

export const updateAddressSchema = z.object({
  full_name: z.string().min(2).max(150).trim().optional(),
  phone: z.string().min(10).max(20).trim().optional(),
  address_line1: z.string().min(3).max(500).trim().optional(),
  address_line2: z.string().max(500).trim().optional().nullable(),
  city: z.string().min(2).max(100).trim().optional(),
  state: z.string().min(2).max(100).trim().optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code').trim().optional(),
  country: z.string().max(100).trim().optional(),
  is_default: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

