/**
 * Health check controller.
 * Returns service status without exposing secrets or database credentials.
 */
import prisma from '../config/prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getHealth(req, res) {
  try {
    // Verify database connectivity with a lightweight query
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(res, {
      message: 'Ghazal Jewellery API is running',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    return sendError(res, {
      message: 'Service degraded — database unreachable',
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  }
}

