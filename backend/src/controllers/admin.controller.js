/**
 * Admin dashboard and metrics controller.
 */
import * as adminService from '../services/admin.service.js';
import { sendSuccess } from '../utils/response.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const summary = await adminService.getDashboardSummary();
    return sendSuccess(res, {
      message: 'Dashboard summary fetched successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentOrders(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const orders = await adminService.getRecentOrders(limit);
    return sendSuccess(res, {
      message: 'Recent orders fetched successfully',
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLowStock(req, res, next) {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : 5;
    const lowStock = await adminService.getLowStockVariants(threshold);
    return sendSuccess(res, {
      message: 'Low stock items fetched successfully',
      data: lowStock,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomers(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { items, meta } = await adminService.getCustomersList(query);
    return sendSuccess(res, {
      message: 'Customers fetched successfully',
      data: items,
      meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminProducts(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { items, meta } = await adminService.getAdminProductsList(query);
    return sendSuccess(res, {
      message: 'Products fetched successfully',
      data: items,
      meta,
    });
  } catch (error) {
    next(error);
  }
}

