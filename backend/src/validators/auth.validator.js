/**
 * Zod validation schemas for Authentication and User Profile.
 */
import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters')
    .trim(),
  email: z
    .string()
    .email('Please provide a valid email address')
    .max(255)
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z
    .string()
    .max(20)
    .trim()
    .optional()
    .nullable(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(150)
    .trim()
    .optional(),
  phone: z
    .string()
    .max(20)
    .trim()
    .optional()
    .nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(100)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
}).refine((data) => data.current_password !== data.new_password, {
  message: 'New password cannot be the same as the current password',
  path: ['new_password'],
});

