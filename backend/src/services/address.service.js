/**
 * Address service — handles customer delivery address operations with strict ownership enforcement.
 */
import prisma from '../config/prisma.js';

/**
 * Get all addresses belonging to the authenticated user.
 */
export async function getUserAddresses(userId) {
  return prisma.addresses.findMany({
    where: { user_id: userId },
    orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
  });
}

/**
 * Create a new address for the user.
 * If it's the first address or marked default, ensures default consistency.
 */
export async function createAddress(userId, data) {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.addresses.count({
      where: { user_id: userId },
    });

    // If first address, automatically make it default
    const shouldBeDefault = existingCount === 0 ? true : Boolean(data.is_default);

    // If making default, unset any existing default addresses
    if (shouldBeDefault && existingCount > 0) {
      await tx.addresses.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    }

    return tx.addresses.create({
      data: {
        user_id: userId,
        full_name: data.full_name,
        phone: data.phone,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country || 'India',
        is_default: shouldBeDefault,
      },
    });
  });
}

/**
 * Update an existing address with ownership check.
 */
export async function updateAddress(userId, addressId, data) {
  const address = await prisma.addresses.findFirst({
    where: { id: addressId, user_id: userId },
  });

  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // If setting as default, unset other defaults
    if (data.is_default === true) {
      await tx.addresses.updateMany({
        where: { user_id: userId, is_default: true, NOT: { id: addressId } },
        data: { is_default: false },
      });
    }

    return tx.addresses.update({
      where: { id: addressId },
      data,
    });
  });
}

/**
 * Delete an address with ownership check.
 * If default is deleted and other addresses exist, promote the newest remaining address.
 */
export async function deleteAddress(userId, addressId) {
  const address = await prisma.addresses.findFirst({
    where: { id: addressId, user_id: userId },
  });

  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    await tx.addresses.delete({
      where: { id: addressId },
    });

    // If the deleted address was the default, set newest remaining as default
    if (address.is_default) {
      const remainingNewest = await tx.addresses.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (remainingNewest) {
        await tx.addresses.update({
          where: { id: remainingNewest.id },
          data: { is_default: true },
        });
      }
    }

    return { message: 'Address deleted successfully' };
  });
}

/**
 * Mark a specific address as default with ownership check.
 */
export async function setDefaultAddress(userId, addressId) {
  const address = await prisma.addresses.findFirst({
    where: { id: addressId, user_id: userId },
  });

  if (!address) {
    const error = new Error('Address not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // Unset current default
    await tx.addresses.updateMany({
      where: { user_id: userId, is_default: true },
      data: { is_default: false },
    });

    // Set target address as default
    return tx.addresses.update({
      where: { id: addressId },
      data: { is_default: true },
    });
  });
}

