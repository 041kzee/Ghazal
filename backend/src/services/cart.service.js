/**
 * Cart service — comprehensive business logic for customer shopping cart.
 * All totals are strictly calculated server-side from current database prices.
 */
import prisma from '../config/prisma.js';

/**
 * Get or create the user's cart.
 */
async function getOrCreateCart(userId) {
  let cart = await prisma.carts.findUnique({
    where: { user_id: userId },
  });

  if (!cart) {
    cart = await prisma.carts.create({
      data: { user_id: userId },
    });
  }

  return cart;
}

/**
 * Get user cart with all items, populated variant details, and server-side computed totals.
 */
export async function getCart(userId) {
  const cart = await getOrCreateCart(userId);

  const cartWithItems = await prisma.carts.findUnique({
    where: { id: cart.id },
    include: {
      cart_items: {
        orderBy: { created_at: 'asc' },
        include: {
          product_variants: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  is_active: true,
                  product_images: {
                    where: { is_primary: true },
                    take: 1,
                    select: { image_url: true, alt_text: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate totals and stock warnings
  let subtotal_paise = 0n;
  let total_quantity = 0;
  const items = [];

  for (const item of cartWithItems.cart_items) {
    const variant = item.product_variants;
    const product = variant.products;
    const isAvailable = product.is_active && variant.is_active && variant.stock >= item.quantity;
    const itemTotalPaise = variant.price_paise * BigInt(item.quantity);

    if (isAvailable) {
      subtotal_paise += itemTotalPaise;
      total_quantity += item.quantity;
    }

    items.push({
      id: item.id,
      variant_id: item.variant_id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      sku: variant.sku,
      size: variant.size,
      material: variant.material,
      color: variant.color,
      price_paise: Number(variant.price_paise),
      quantity: item.quantity,
      item_total_paise: Number(itemTotalPaise),
      stock: variant.stock,
      is_available: isAvailable,
      image: product.product_images[0] || null,
    });
  }

  return {
    cart_id: cart.id,
    items,
    summary: {
      item_count: items.length,
      total_quantity,
      subtotal_paise: Number(subtotal_paise),
      total_amount_paise: Number(subtotal_paise),
    },
  };
}

/**
 * Add an item to the cart or increment quantity if already present.
 * Strictly verifies product & variant availability and inventory.
 */
export async function addItemToCart(userId, variantId, quantity = 1) {
  const cart = await getOrCreateCart(userId);

  // Validate variant & product
  const variant = await prisma.product_variants.findUnique({
    where: { id: variantId },
    include: { products: true },
  });

  if (!variant || !variant.products) {
    const error = new Error('Product variant not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!variant.is_active || !variant.products.is_active) {
    const error = new Error('This product or variant is currently unavailable');
    error.statusCode = 400;
    error.code = 'PRODUCT_UNAVAILABLE';
    throw error;
  }

  // Check existing item in cart
  const existingItem = await prisma.cart_items.findUnique({
    where: {
      cart_id_variant_id: {
        cart_id: cart.id,
        variant_id: variantId,
      },
    },
  });

  const desiredQuantity = (existingItem?.quantity || 0) + quantity;

  // Validate stock
  if (desiredQuantity > variant.stock) {
    const error = new Error(`Cannot add ${quantity} item(s). Only ${variant.stock} available in stock.`);
    error.statusCode = 400;
    error.code = 'INSUFFICIENT_STOCK';
    throw error;
  }

  if (existingItem) {
    await prisma.cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: desiredQuantity,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.cart_items.create({
      data: {
        cart_id: cart.id,
        variant_id: variantId,
        quantity,
      },
    });
  }

  return getCart(userId);
}

/**
 * Update quantity of a cart item with ownership and stock checks.
 */
export async function updateCartItemQuantity(userId, cartItemId, quantity) {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cart_items.findFirst({
    where: { id: cartItemId, cart_id: cart.id },
    include: { product_variants: true },
  });

  if (!cartItem) {
    const error = new Error('Cart item not found in your cart');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (quantity > cartItem.product_variants.stock) {
    const error = new Error(`Requested quantity (${quantity}) exceeds available stock (${cartItem.product_variants.stock}).`);
    error.statusCode = 400;
    error.code = 'INSUFFICIENT_STOCK';
    throw error;
  }

  await prisma.cart_items.update({
    where: { id: cartItemId },
    data: {
      quantity,
      updated_at: new Date(),
    },
  });

  return getCart(userId);
}

/**
 * Remove an item from the cart with ownership check.
 */
export async function removeCartItem(userId, cartItemId) {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cart_items.findFirst({
    where: { id: cartItemId, cart_id: cart.id },
  });

  if (!cartItem) {
    const error = new Error('Cart item not found in your cart');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  await prisma.cart_items.delete({
    where: { id: cartItemId },
  });

  return getCart(userId);
}

/**
 * Clear all items in the user's cart.
 */
export async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);

  await prisma.cart_items.deleteMany({
    where: { cart_id: cart.id },
  });

  return getCart(userId);
}

