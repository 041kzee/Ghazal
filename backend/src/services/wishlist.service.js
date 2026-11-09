/**
 * Wishlist service — handles customer wishlist items and duplicate prevention.
 */
import prisma from '../config/prisma.js';

/**
 * Get or create the user's wishlist.
 */
async function getOrCreateWishlist(userId) {
  let wishlist = await prisma.wishlists.findUnique({
    where: { user_id: userId },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlists.create({
      data: { user_id: userId },
    });
  }

  return wishlist;
}

/**
 * Get user wishlist with full product, variant, and image details.
 */
export async function getWishlist(userId) {
  const wishlist = await getOrCreateWishlist(userId);

  const wishlistWithItems = await prisma.wishlists.findUnique({
    where: { id: wishlist.id },
    include: {
      wishlist_items: {
        orderBy: { created_at: 'desc' },
        include: {
          products: {
            include: {
              categories: { select: { id: true, name: true, slug: true } },
              product_variants: {
                where: { is_active: true },
                orderBy: { price_paise: 'asc' },
                select: { id: true, sku: true, price_paise: true, stock: true },
              },
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
  });

  const items = wishlistWithItems.wishlist_items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    added_at: item.created_at,
    product: {
      id: item.products.id,
      name: item.products.name,
      slug: item.products.slug,
      is_active: item.products.is_active,
      category: item.products.categories,
      starting_price_paise: item.products.product_variants[0]?.price_paise
        ? Number(item.products.product_variants[0].price_paise)
        : null,
      in_stock: item.products.product_variants.some((v) => v.stock > 0),
      image: item.products.product_images[0] || null,
    },
  }));

  return {
    wishlist_id: wishlist.id,
    item_count: items.length,
    items,
  };
}

/**
 * Add a product to the user's wishlist.
 * Prevents duplicates via unique constraint / check.
 */
export async function addToWishlist(userId, productId) {
  const wishlist = await getOrCreateWishlist(userId);

  // Check product existence
  const product = await prisma.products.findUnique({
    where: { id: productId },
  });

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Idempotent upsert: if already in wishlist, return without error
  const existing = await prisma.wishlist_items.findUnique({
    where: {
      wishlist_id_product_id: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    },
  });

  if (!existing) {
    await prisma.wishlist_items.create({
      data: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    });
  }

  return getWishlist(userId);
}

/**
 * Remove a product from the user's wishlist with ownership check.
 */
export async function removeFromWishlist(userId, productId) {
  const wishlist = await getOrCreateWishlist(userId);

  await prisma.wishlist_items.deleteMany({
    where: {
      wishlist_id: wishlist.id,
      product_id: productId,
    },
  });

  return getWishlist(userId);
}

