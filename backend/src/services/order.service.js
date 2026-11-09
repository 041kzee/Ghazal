/**
 * Order service — checkout, order tracking, status transitions, stock reservation, and cancellation.
 */
import prisma from '../config/prisma.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { buildPaginationMeta } from '../utils/pagination.js';

// Valid status transitions
const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
};

/**
 * Standard include for order responses.
 */
const orderInclude = {
  order_items: {
    select: {
      id: true,
      product_id: true,
      variant_id: true,
      product_name: true,
      sku: true,
      variant_details: true,
      quantity: true,
      price_at_purchase_paise: true,
    },
  },
  payments: {
    select: {
      id: true,
      amount_paise: true,
      payment_method: true,
      status: true,
      gateway: true,
      transaction_id: true,
      created_at: true,
    },
  },
};

/**
 * Create a new order (Checkout).
 * Executes in a strict ACID transaction to prevent overselling.
 */
export async function createOrder(userId, data) {
  // 1. Resolve Shipping Address snapshot
  let shippingAddressSnapshot = null;

  if (data.address_id) {
    const savedAddress = await prisma.addresses.findFirst({
      where: { id: data.address_id, user_id: userId },
    });
    if (!savedAddress) {
      const error = new Error('Shipping address not found in your saved addresses');
      error.statusCode = 404;
      error.code = 'ADDRESS_NOT_FOUND';
      throw error;
    }
    shippingAddressSnapshot = {
      full_name: savedAddress.full_name,
      phone: savedAddress.phone,
      address_line1: savedAddress.address_line1,
      address_line2: savedAddress.address_line2,
      city: savedAddress.city,
      state: savedAddress.state,
      pincode: savedAddress.pincode,
      country: savedAddress.country,
    };
  } else if (data.shipping_address) {
    shippingAddressSnapshot = { ...data.shipping_address };
  }

  // 2. Resolve Checkout Items
  let itemsToCheckout = [];

  if (data.use_cart) {
    const userCart = await prisma.carts.findUnique({
      where: { user_id: userId },
      include: { cart_items: true },
    });

    if (!userCart || userCart.cart_items.length === 0) {
      const error = new Error('Your cart is empty');
      error.statusCode = 400;
      error.code = 'CART_EMPTY';
      throw error;
    }

    itemsToCheckout = userCart.cart_items.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));
  } else {
    itemsToCheckout = data.items;
  }

  // 3. Atomically validate, reserve stock, and create order records
  return prisma.$transaction(async (tx) => {
    let subtotal_paise = 0n;
    const orderItemsData = [];

    for (const item of itemsToCheckout) {
      // Re-read variant from database inside transaction
      const variant = await tx.product_variants.findUnique({
        where: { id: item.variant_id },
        include: { products: true },
      });

      if (!variant || !variant.products) {
        const error = new Error(`Item ${item.variant_id} is no longer available`);
        error.statusCode = 400;
        error.code = 'ITEM_UNAVAILABLE';
        throw error;
      }

      if (!variant.is_active || !variant.products.is_active) {
        const error = new Error(`Product "${variant.products.name}" is currently unavailable`);
        error.statusCode = 400;
        error.code = 'PRODUCT_UNAVAILABLE';
        throw error;
      }

      // Concurrency check: verify stock
      if (variant.stock < item.quantity) {
        const error = new Error(
          `Insufficient stock for "${variant.products.name} (${variant.sku})". Only ${variant.stock} left in stock.`
        );
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }

      // Decrement stock immediately
      await tx.product_variants.update({
        where: { id: variant.id },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      const itemTotalPaise = variant.price_paise * BigInt(item.quantity);
      subtotal_paise += itemTotalPaise;

      orderItemsData.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        product_name: variant.products.name,
        sku: variant.sku,
        variant_details: {
          size: variant.size,
          material: variant.material,
          color: variant.color,
          weight_grams: variant.weight_grams ? Number(variant.weight_grams) : null,
        },
        quantity: item.quantity,
        price_at_purchase_paise: variant.price_paise,
      });
    }

    // Shipping calculation: Free shipping above 50,000 INR (5,000,000 paise), else 150 INR (15,000 paise)
    const shipping_paise = subtotal_paise >= 5000000n ? 0n : 15000n;
    const discount_paise = 0n;
    const total_amount_paise = subtotal_paise + shipping_paise - discount_paise;

    // Generate unique order number
    const order_number = generateOrderNumber();

    // Create Order
    const order = await tx.orders.create({
      data: {
        order_number,
        user_id: userId,
        status: 'PENDING',
        subtotal_paise,
        shipping_paise,
        discount_paise,
        total_amount_paise,
        shipping_address: shippingAddressSnapshot,
        order_items: {
          create: orderItemsData,
        },
        payments: {
          create: {
            amount_paise: total_amount_paise,
            payment_method: data.payment_method || 'ONLINE',
            status: 'PENDING',
            gateway: data.payment_method === 'COD' ? 'MANUAL' : 'RAZORPAY',
          },
        },
      },
      include: orderInclude,
    });

    // If checked out from cart, clear cart
    if (data.use_cart) {
      const userCart = await tx.carts.findUnique({ where: { user_id: userId } });
      if (userCart) {
        await tx.cart_items.deleteMany({ where: { cart_id: userCart.id } });
      }
    }

    return order;
  });
}

/**
 * Get orders for the logged-in customer.
 */
export async function getMyOrders(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.orders.findMany({
      where: { user_id: userId },
      include: orderInclude,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.orders.count({ where: { user_id: userId } }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { items, meta };
}

/**
 * Get single order details with ownership verification.
 */
export async function getOrderById(orderId, userId, isAdmin = false) {
  const where = { id: orderId };
  if (!isAdmin) where.user_id = userId;

  const order = await prisma.orders.findFirst({
    where,
    include: {
      ...orderInclude,
      users: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return order;
}

/**
 * Customer cancel order.
 * Only permitted if status is PENDING or CONFIRMED.
 * Restores inventory in transaction and never deletes order record.
 */
export async function cancelCustomerOrder(orderId, userId) {
  const order = await prisma.orders.findFirst({
    where: { id: orderId, user_id: userId },
    include: { order_items: true },
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
    const error = new Error(`Order cannot be cancelled in its current state (${order.status}).`);
    error.statusCode = 400;
    error.code = 'CANNOT_CANCEL_ORDER';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // Restore inventory for each item
    for (const item of order.order_items) {
      if (item.variant_id) {
        await tx.product_variants.update({
          where: { id: item.variant_id },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }
    }

    // Update payment status
    await tx.payments.updateMany({
      where: { order_id: orderId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });

    // Update order status to CANCELLED
    return tx.orders.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        updated_at: new Date(),
      },
      include: orderInclude,
    });
  });
}

/**
 * Admin: List all orders with filters and pagination.
 */
export async function getAdminOrders(query) {
  const { page = 1, limit = 20, status, search } = query;
  const skip = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { order_number: { contains: search, mode: 'insensitive' } },
      { users: { email: { contains: search, mode: 'insensitive' } } },
      { users: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.orders.findMany({
      where,
      include: {
        ...orderInclude,
        users: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.orders.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { items, meta };
}

/**
 * Admin: Update order status following valid state transitions.
 */
export async function updateOrderStatusAdmin(orderId, newStatus) {
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: { order_items: true },
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (order.status === newStatus) {
    return order;
  }

  // Validate allowed state transitions
  const allowedNext = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowedNext.includes(newStatus)) {
    const error = new Error(
      `Invalid order status transition from ${order.status} to ${newStatus}. Allowed transitions: [${allowedNext.join(', ')}]`
    );
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // If transitioning to CANCELLED, restore inventory
    if (newStatus === 'CANCELLED') {
      for (const item of order.order_items) {
        if (item.variant_id) {
          await tx.product_variants.update({
            where: { id: item.variant_id },
            data: {
              stock: { increment: item.quantity },
            },
          });
        }
      }
    }

    return tx.orders.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
      include: orderInclude,
    });
  });
}

