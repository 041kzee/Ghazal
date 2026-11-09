/**
 * Category service — business logic and database operations.
 */
import prisma from '../config/prisma.js';
import { generateSlug } from '../utils/slug.js';

/**
 * Get all active categories (public).
 */
export async function getAllCategories() {
  return prisma.categories.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image_url: true,
      is_active: true,
      created_at: true,
      _count: {
        select: { products: true },
      },
    },
  });
}

/**
 * Get all categories including inactive (admin).
 */
export async function getAllCategoriesAdmin() {
  return prisma.categories.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image_url: true,
      is_active: true,
      created_at: true,
      _count: {
        select: { products: true },
      },
    },
  });
}

/**
 * Get a category by slug (public — only active).
 */
export async function getCategoryBySlug(slug) {
  return prisma.categories.findFirst({
    where: { slug, is_active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image_url: true,
      is_active: true,
      created_at: true,
      _count: {
        select: { products: true },
      },
    },
  });
}

/**
 * Create a new category (admin).
 */
export async function createCategory(data) {
  // Generate slug from name if not provided
  const slug = data.slug || generateSlug(data.name);

  // Check for duplicate slug
  const existing = await prisma.categories.findUnique({
    where: { slug },
  });
  if (existing) {
    const error = new Error('A category with this slug already exists');
    error.statusCode = 409;
    error.code = 'DUPLICATE_SLUG';
    throw error;
  }

  return prisma.categories.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      image_url: data.image_url || null,
      is_active: data.is_active ?? true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image_url: true,
      is_active: true,
      created_at: true,
    },
  });
}

/**
 * Update an existing category (admin).
 */
export async function updateCategory(id, data) {
  // If name is being changed and no new slug provided, regenerate slug
  const updateData = { ...data };

  if (data.name && !data.slug) {
    updateData.slug = generateSlug(data.name);
  }

  // If slug is being changed, check for duplicates
  if (updateData.slug) {
    const existing = await prisma.categories.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    });
    if (existing) {
      const error = new Error('A category with this slug already exists');
      error.statusCode = 409;
      error.code = 'DUPLICATE_SLUG';
      throw error;
    }
  }

  return prisma.categories.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image_url: true,
      is_active: true,
      created_at: true,
    },
  });
}

/**
 * Delete a category (admin).
 * If the category has products, deactivate instead of deleting.
 */
export async function deleteCategory(id) {
  // Check if category exists
  const category = await prisma.categories.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // If the category has products, deactivate it instead of deleting
  if (category._count.products > 0) {
    await prisma.categories.update({
      where: { id },
      data: { is_active: false },
    });
    return {
      action: 'deactivated',
      message: `Category deactivated because it has ${category._count.products} product(s). Remove the products first to permanently delete.`,
    };
  }

  // Safe to delete — no products attached
  await prisma.categories.delete({ where: { id } });
  return {
    action: 'deleted',
    message: 'Category permanently deleted',
  };
}

