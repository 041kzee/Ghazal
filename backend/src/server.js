/**
 * Server entry point for Ghazal Jewellery backend.
 *
 * Responsibilities:
 *  - Load environment variables
 *  - Start Express on configured port
 *  - Handle graceful shutdown (SIGINT, SIGTERM)
 *  - Clean Prisma disconnection on exit
 */
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './config/prisma.js';

const PORT = parseInt(process.env.PORT, 10) || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Ghazal Jewellery API Server                    ║
║   Running on: http://localhost:${PORT}              ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(33)}║
╚══════════════════════════════════════════════════╝
  `);
});

// ─── Graceful Shutdown ──────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed.');

    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected.');
    } catch (err) {
      console.error('Error disconnecting Prisma:', err.message);
    }

    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown — could not close connections in time.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

