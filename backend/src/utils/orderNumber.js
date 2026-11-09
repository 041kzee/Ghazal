/**
 * Order number generator utility.
 * Generates human-readable, unique e-commerce order numbers like: GZ-20261109-A7F2
 */
import crypto from 'crypto';

export function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GZ-${dateStr}-${randomSuffix}`;
}

