/**
 * Express application configuration for Ghazal Jewellery backend.
 *
 * Middleware stack:
 *  1. Helmet — security headers
 *  2. CORS — restricted to configured frontend origin
 *  3. JSON body parser — 10kb limit
 *  4. Cookie parser
 *  5. Rate limiter — global + stricter on auth routes
 *  6. Routes
 *  7. 404 handler
 *  8. Centralized error handler
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { globalLimiter } from './middleware/rateLimiter.js';

import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// --- Route imports ---
import healthRoutes from './routes/health.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import authRoutes from './routes/auth.routes.js';
import addressRoutes from './routes/address.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ─── 1. Security Headers ────────────────────────────────────────
app.use(helmet());

// ─── 2. CORS ────────────────────────────────────────────────────
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── 3. Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── 4. Cookie Parser ──────────────────────────────────────────
app.use(cookieParser());

// ─── 5. Global Rate Limiter ─────────────────────────────────────
app.use(globalLimiter);

// ─── 6. Routes ──────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// ─── 7. 404 Handler ────────────────────────────────────────────
app.use(notFoundHandler);

// ─── 8. Error Handler ──────────────────────────────────────────
app.use(errorHandler);

export default app;

