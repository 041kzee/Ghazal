/**
 * Authentication controller — register, login, logout, me, change password.
 */
import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

// Secure cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

/**
 * POST /api/auth/register
 * Public: register customer account.
 */
export async function register(req, res, next) {
  try {
    const { user, token } = await authService.registerCustomer(req.body);

    // Set HttpOnly cookie for browser clients
    res.cookie('token', token, getCookieOptions());

    return sendSuccess(res, {
      message: 'Registration successful',
      data: { user, token },
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Public: login with email and password.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);

    // Set HttpOnly cookie for browser clients
    res.cookie('token', token, getCookieOptions());

    return sendSuccess(res, {
      message: 'Login successful',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Authenticated: logout and clear token cookie.
 */
export async function logout(req, res, next) {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return sendSuccess(res, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Authenticated: get profile of current user.
 */
export async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, {
      message: 'Profile fetched successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/auth/me
 * Authenticated: update profile of current user.
 */
export async function updateMe(req, res, next) {
  try {
    const updated = await authService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/change-password
 * Authenticated: change password.
 */
export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const result = await authService.changePassword(req.user.id, current_password, new_password);
    return sendSuccess(res, {
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

