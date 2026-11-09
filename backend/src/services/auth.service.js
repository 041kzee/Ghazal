/**
 * Authentication service — registration, login, profile management, and password change.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT token for a user.
 */
export function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Register a new customer.
 * Enforces role=CUSTOMER unconditionally and creates initial cart and wishlist.
 */
export async function registerCustomer(data) {
  const normalizedEmail = data.email.trim().toLowerCase();

  // Check email uniqueness
  const existing = await prisma.users.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }

  // Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Atomically create user + cart + wishlist
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.users.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: data.phone?.trim() || null,
        role: 'CUSTOMER', // Strict: public register can NEVER set ADMIN
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
      },
    });

    // Initialize user cart
    await tx.carts.create({
      data: { user_id: newUser.id },
    });

    // Initialize user wishlist
    await tx.wishlists.create({
      data: { user_id: newUser.id },
    });

    return newUser;
  });

  const token = signToken(user);

  return { user, token };
}

/**
 * Login user.
 * Returns generic error message to prevent email enumeration.
 */
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.users.findUnique({
    where: { email: normalizedEmail },
  });

  // Generic credential error
  const invalidCredentialsError = () => {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    return error;
  };

  if (!user) {
    throw invalidCredentialsError();
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw invalidCredentialsError();
  }

  const token = signToken(user);

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at,
  };

  return { user: safeUser, token };
}

/**
 * Get current user profile.
 */
export async function getProfile(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return user;
}

/**
 * Update current user profile.
 */
export async function updateProfile(userId, data) {
  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  updateData.updated_at = new Date();

  return prisma.users.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
  });
}

/**
 * Change password for authenticated user.
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentValid) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    error.code = 'INVALID_CURRENT_PASSWORD';
    throw error;
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await prisma.users.update({
    where: { id: userId },
    data: {
      password: hashedNewPassword,
      updated_at: new Date(),
    },
  });

  return { message: 'Password changed successfully' };
}

