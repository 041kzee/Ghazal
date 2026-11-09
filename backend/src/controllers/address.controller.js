/**
 * Address controller — handles HTTP requests for customer addresses.
 */
import * as addressService from '../services/address.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/addresses
 * Authenticated: list customer addresses.
 */
export async function getAddresses(req, res, next) {
  try {
    const addresses = await addressService.getUserAddresses(req.user.id);
    return sendSuccess(res, {
      message: 'Addresses fetched successfully',
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/addresses
 * Authenticated: create delivery address.
 */
export async function createAddress(req, res, next) {
  try {
    const address = await addressService.createAddress(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Address created successfully',
      data: address,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/addresses/:id
 * Authenticated: update delivery address.
 */
export async function updateAddress(req, res, next) {
  try {
    const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/addresses/:id
 * Authenticated: delete delivery address.
 */
export async function deleteAddress(req, res, next) {
  try {
    const result = await addressService.deleteAddress(req.user.id, req.params.id);
    return sendSuccess(res, {
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/addresses/:id/default
 * Authenticated: set default delivery address.
 */
export async function setDefaultAddress(req, res, next) {
  try {
    const address = await addressService.setDefaultAddress(req.user.id, req.params.id);
    return sendSuccess(res, {
      message: 'Default address updated successfully',
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

