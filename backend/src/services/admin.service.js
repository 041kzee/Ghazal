/**
 * Admin Dashboard service — aggregated metrics, recent orders, inventory alerts, and customer management.
 */
import prisma from '../config/prisma.js';
import { buildPaginationMeta } from '../utils/pagination.js';

/**
 * Get top-level dashboard summary metrics.
 */
export async function getDashboardSummary() {
  const [
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalCustomers,
    totalProducts,
    lowStockCount,
    revenueAgg,
  ] = await prisma.$transaction([
    prisma.orders.count(),
    prisma.orders.count({ where: { status: 'PENDING' } }),
    prisma.orders.count({ where: { status: 'DELIVERED' } }),
    prisma.users.count({ where: { role: 'CUSTOMER' } }),
    prisma.products.count(),
    prisma.product_variants.count({ where: { stock: { lte: 5 }, is_active: true } }),
    prisma.orders.aggregate({
      _sum: { total_amount_paise: true },
      where: { status: { not: 'CANCELLED' } },
    }),
  ]);

  return {
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    delivered_orders: deliveredOrders,
    total_customers: totalCustomers,
    total_products: totalProducts,
    low_stock_items: lowStockCount,
    total_revenue_paise: Number(revenueAgg._sum.total_amount_paise || 0n),
  };
}

/**
 * Get recent orders for dashboard widget.
 */
export async function getRecentOrders(limit = 10) {
  const orders = await prisma.orders.findMany({
    orderBy: { created_at: 'desc' },
    take: limit,
    select: {
      id: true,
      order_number: true,
      status: true,
      total_amount_paise: true,
      created_at: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { order_items: true },
      },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    total_amount_paise: Number(o.total_amount_paise),
    created_at: o.created_at,
    item_count: o._count.order_items,
    customer: o.users,
  }));
}

/**
 * Get low stock inventory alerts.
 */
export async function getLowStockVariants(threshold = 5) {
  const variants = await prisma.product_variants.findMany({
    where: {
      stock: { lte: threshold },
      is_active: true,
    },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { stock: 'asc' },
  });

  return variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    material: v.material,
    color: v.color,
    stock: v.stock,
    price_paise: Number(v.price_paise),
    product: v.products,
  }));
}

/**
 * List registered customers with order history summary and pagination.
 */
export async function getCustomersList({ page = 1, limit = 20, search }) {
  const skip = (page - 1) * limit;

  const where = { role: 'CUSTOMER' };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await prisma.$transaction([
    prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        created_at: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.users.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { items: customers, meta };
}

/**
 * List all products for admin management (both active and inactive).
 */
export async function getAdminProductsList({ page = 1, limit = 20, search }) {
  const skip = (page - 1) * limit;

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await prisma.$transaction([
    prisma.products.findMany({
      where,
      include: {
        categories: { select: { id: true, name: true, slug: true } },
        product_variants: {
          orderBy: { price_paise: 'asc' },
          select: { id: true, sku: true, price_paise: true, stock: true, is_active: true },
        },
        product_images: {
          orderBy: [{ is_primary: 'desc' }, { display_order: 'asc' }],
          take: 1,
          select: { image_url: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.products.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { items: products, meta };
}

