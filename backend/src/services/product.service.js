/**
 * Product service — comprehensive business logic for products, variants, and images.
 */
import prisma from '../config/prisma.js';
import { generateSlug } from '../utils/slug.js';
import { buildPaginationMeta } from '../utils/pagination.js';

/**
 * Common select/include for public product queries.
 */
const productInclude = {
  categories: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  product_variants: {
    where: { is_active: true },
    orderBy: { price_paise: 'asc' },
    select: {
      id: true,
      sku: true,
      size: true,
      material: true,
      color: true,
      weight_grams: true,
      price_paise: true,
      stock: true,
      is_active: true,
    },
  },
  product_images: {
    orderBy: [{ is_primary: 'desc' }, { display_order: 'asc' }],
    select: {
      id: true,
      image_url: true,
      alt_text: true,
      is_primary: true,
      display_order: true,
    },
  },
};

/**
 * Public: List products with pagination, search, filtering, and sorting.
 * Never exposes inactive products.
 */
export async function getPublicProducts(query) {
  const {
    page = 1,
    limit = 20,
    search,
    category,
    material,
    min_price,
    max_price,
    in_stock,
    sort_by = 'newest',
    is_featured,
  } = query;

  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const where = {
    is_active: true,
  };

  // Search by name, description, material, or sku
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { material: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by category (by UUID or slug)
  if (category) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    if (isUuid) {
      where.category_id = category;
    } else {
      where.categories = { slug: category };
    }
  }

  // Filter by material
  if (material) {
    where.material = { contains: material, mode: 'insensitive' };
  }

  // Filter by featured
  if (typeof is_featured === 'boolean') {
    where.is_featured = is_featured;
  }

  // Filter by stock
  if (in_stock === true) {
    where.product_variants = {
      some: {
        is_active: true,
        stock: { gt: 0 },
      },
    };
  }

  // Filter by price range
  if (min_price !== undefined || max_price !== undefined) {
    const priceFilter = {};
    if (min_price !== undefined) priceFilter.gte = BigInt(min_price);
    if (max_price !== undefined) priceFilter.lte = BigInt(max_price);

    where.product_variants = {
      ...(where.product_variants || {}),
      some: {
        ...(where.product_variants?.some || {}),
        is_active: true,
        price_paise: priceFilter,
      },
    };
  }

  // Determine sorting order
  let orderBy = [{ created_at: 'desc' }];
  if (sort_by === 'newest') orderBy = [{ created_at: 'desc' }];
  if (sort_by === 'oldest') orderBy = [{ created_at: 'asc' }];
  if (sort_by === 'name_asc') orderBy = [{ name: 'asc' }];
  if (sort_by === 'name_desc') orderBy = [{ name: 'desc' }];

  // Execute query and total count in transaction
  const [items, total] = await prisma.$transaction([
    prisma.products.findMany({
      where,
      include: productInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.products.count({ where }),
  ]);

  // Client-side sort by lowest variant price if requested
  if (sort_by === 'price_asc') {
    items.sort((a, b) => {
      const minA = a.product_variants[0]?.price_paise ? Number(a.product_variants[0].price_paise) : Infinity;
      const minB = b.product_variants[0]?.price_paise ? Number(b.product_variants[0].price_paise) : Infinity;
      return minA - minB;
    });
  } else if (sort_by === 'price_desc') {
    items.sort((a, b) => {
      const maxA = a.product_variants[0]?.price_paise ? Number(a.product_variants[0].price_paise) : -Infinity;
      const maxB = b.product_variants[0]?.price_paise ? Number(b.product_variants[0].price_paise) : -Infinity;
      return maxB - maxA;
    });
  }

  const meta = buildPaginationMeta(total, page, limit);

  return { items, meta };
}

/**
 * Public: Get single active product by ID.
 */
export async function getProductById(id, includeInactive = false) {
  const where = { id };
  if (!includeInactive) where.is_active = true;

  return prisma.products.findFirst({
    where,
    include: productInclude,
  });
}

/**
 * Public: Get single active product by Slug.
 */
export async function getProductBySlug(slug, includeInactive = false) {
  const where = { slug };
  if (!includeInactive) where.is_active = true;

  return prisma.products.findFirst({
    where,
    include: productInclude,
  });
}

/**
 * Public: Get featured active products.
 */
export async function getFeaturedProducts(limit = 8) {
  return prisma.products.findMany({
    where: {
      is_active: true,
      is_featured: true,
    },
    include: productInclude,
    orderBy: { created_at: 'desc' },
    take: limit,
  });
}

/**
 * Admin: Create a product with optional variants and images in transaction.
 */
export async function createProduct(data) {
  const { variants = [], images = [], ...productData } = data;

  // Verify category exists
  const category = await prisma.categories.findUnique({
    where: { id: productData.category_id },
  });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    error.code = 'CATEGORY_NOT_FOUND';
    throw error;
  }

  // Generate slug if omitted
  const slug = productData.slug || generateSlug(productData.name);

  // Check unique slug & sku
  const existingProduct = await prisma.products.findFirst({
    where: {
      OR: [{ slug }, { sku: productData.sku }],
    },
  });
  if (existingProduct) {
    const field = existingProduct.slug === slug ? 'slug' : 'SKU';
    const error = new Error(`A product with this ${field} already exists`);
    error.statusCode = 409;
    error.code = 'DUPLICATE_ENTRY';
    throw error;
  }

  // Create product + variants + images atomically
  return prisma.$transaction(async (tx) => {
    const product = await tx.products.create({
      data: {
        name: productData.name,
        slug,
        description: productData.description || null,
        sku: productData.sku,
        material: productData.material || null,
        is_active: productData.is_active ?? true,
        is_featured: productData.is_featured ?? false,
        category_id: productData.category_id,
      },
    });

    // Create variants if supplied
    if (variants.length > 0) {
      await tx.product_variants.createMany({
        data: variants.map((v) => ({
          product_id: product.id,
          sku: v.sku,
          size: v.size || null,
          material: v.material || null,
          color: v.color || null,
          weight_grams: v.weight_grams ? v.weight_grams : null,
          price_paise: BigInt(v.price_paise),
          stock: v.stock ?? 0,
          is_active: v.is_active ?? true,
        })),
      });
    }

    // Create images if supplied
    if (images.length > 0) {
      await tx.product_images.createMany({
        data: images.map((img, idx) => ({
          product_id: product.id,
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          is_primary: img.is_primary || idx === 0,
          display_order: img.display_order ?? idx,
        })),
      });
    }

    // Return complete created product
    return tx.products.findUnique({
      where: { id: product.id },
      include: productInclude,
    });
  });
}

/**
 * Admin: Update an existing product.
 */
export async function updateProduct(id, data) {
  const existing = await prisma.products.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const updateData = { ...data };

  // Regenerate slug if name changed and no explicit slug
  if (data.name && !data.slug) {
    updateData.slug = generateSlug(data.name);
  }

  // Check unique constraints if slug or sku changed
  if (updateData.slug || updateData.sku) {
    const conflict = await prisma.products.findFirst({
      where: {
        OR: [
          updateData.slug ? { slug: updateData.slug } : undefined,
          updateData.sku ? { sku: updateData.sku } : undefined,
        ].filter(Boolean),
        NOT: { id },
      },
    });
    if (conflict) {
      const field = conflict.slug === updateData.slug ? 'slug' : 'SKU';
      const error = new Error(`A product with this ${field} already exists`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_ENTRY';
      throw error;
    }
  }

  // Verify category if changed
  if (updateData.category_id) {
    const cat = await prisma.categories.findUnique({ where: { id: updateData.category_id } });
    if (!cat) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
  }

  return prisma.products.update({
    where: { id },
    data: updateData,
    include: productInclude,
  });
}

/**
 * Admin: Delete or safely deactivate a product.
 * If product was ever ordered in order_items, deactivate it to preserve order history.
 */
export async function deleteProduct(id) {
  const product = await prisma.products.findUnique({
    where: { id },
    include: {
      _count: {
        select: { order_items: true },
      },
    },
  });

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // If referenced in orders, do not delete — deactivate instead
  if (product._count.order_items > 0) {
    await prisma.products.update({
      where: { id },
      data: { is_active: false },
    });
    return {
      action: 'deactivated',
      message: `Product has been purchased in ${product._count.order_items} order(s). Deactivated instead of deleted to protect order history.`,
    };
  }

  // Otherwise safe to delete (cascades to variants, images, wishlist, cart)
  await prisma.products.delete({ where: { id } });
  return {
    action: 'deleted',
    message: 'Product permanently deleted',
  };
}

/**
 * Admin: Toggle product availability.
 */
export async function toggleProductAvailability(id, is_active) {
  const existing = await prisma.products.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return prisma.products.update({
    where: { id },
    data: { is_active },
    select: {
      id: true,
      name: true,
      sku: true,
      is_active: true,
      updated_at: true,
    },
  });
}

/**
 * Admin: Add variant to a product.
 */
export async function addVariant(productId, data) {
  const product = await prisma.products.findUnique({ where: { id: productId } });
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return prisma.product_variants.create({
    data: {
      product_id: productId,
      sku: data.sku,
      size: data.size || null,
      material: data.material || null,
      color: data.color || null,
      weight_grams: data.weight_grams || null,
      price_paise: BigInt(data.price_paise),
      stock: data.stock ?? 0,
      is_active: data.is_active ?? true,
    },
  });
}

/**
 * Admin: Update product variant.
 */
export async function updateVariant(productId, variantId, data) {
  const variant = await prisma.product_variants.findFirst({
    where: { id: variantId, product_id: productId },
  });
  if (!variant) {
    const error = new Error('Variant not found for this product');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const updateData = { ...data };
  if (data.price_paise !== undefined) {
    updateData.price_paise = BigInt(data.price_paise);
  }

  return prisma.product_variants.update({
    where: { id: variantId },
    data: updateData,
  });
}

/**
 * Admin: Delete product variant.
 */
export async function deleteVariant(productId, variantId) {
  const variant = await prisma.product_variants.findFirst({
    where: { id: variantId, product_id: productId },
    include: {
      _count: {
        select: { order_items: true },
      },
    },
  });

  if (!variant) {
    const error = new Error('Variant not found for this product');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (variant._count.order_items > 0) {
    await prisma.product_variants.update({
      where: { id: variantId },
      data: { is_active: false },
    });
    return {
      action: 'deactivated',
      message: 'Variant has been ordered previously. Deactivated instead of deleted.',
    };
  }

  await prisma.product_variants.delete({ where: { id: variantId } });
  return {
    action: 'deleted',
    message: 'Variant deleted successfully',
  };
}

/**
 * Admin: Add image to product.
 */
export async function addImage(productId, data) {
  const product = await prisma.products.findUnique({ where: { id: productId } });
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // If setting as primary, unset other primary images
    if (data.is_primary) {
      await tx.product_images.updateMany({
        where: { product_id: productId },
        data: { is_primary: false },
      });
    }

    return tx.product_images.create({
      data: {
        product_id: productId,
        image_url: data.image_url,
        alt_text: data.alt_text || null,
        is_primary: data.is_primary ?? false,
        display_order: data.display_order ?? 0,
      },
    });
  });
}

/**
 * Admin: Delete image from product.
 */
export async function deleteImage(productId, imageId) {
  const image = await prisma.product_images.findFirst({
    where: { id: imageId, product_id: productId },
  });
  if (!image) {
    const error = new Error('Image not found for this product');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  await prisma.product_images.delete({ where: { id: imageId } });
  return { action: 'deleted', message: 'Image deleted successfully' };
}

