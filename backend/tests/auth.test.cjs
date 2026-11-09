/**
 * Auth Module End-to-End Test Suite.
 */
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function req(method, path, body, token, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = cookie;

    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        let p;
        try { p = JSON.parse(d); } catch { p = d; }
        resolve({ status: res.statusCode, body: p, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0;
let failed = 0;

function ok(name, cond, detail) {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name} — ${detail || ''}`);
    failed++;
  }
}

async function run() {
  const testEmail = `auth_test_${Date.now()}@ghazal.test`;
  let customerUser, customerToken, cookieHeader;

  try {
    console.log('\n=== AUTHENTICATION & USERS MODULE TESTS ===\n');

    // 1. Weak password validation
    console.log('--- 1. Validation: weak password on register ---');
    let r = await req('POST', '/api/auth/register', {
      name: 'Weak User',
      email: testEmail,
      password: 'weak',
    });
    ok('Returns 422', r.status === 422);
    ok('Code is VALIDATION_ERROR', r.body.code === 'VALIDATION_ERROR');

    // 2. Successful customer registration
    console.log('\n--- 2. Public: POST /api/auth/register ---');
    r = await req('POST', '/api/auth/register', {
      name: 'Fatima Al-Zahra',
      email: testEmail,
      password: 'SecurePassword123!',
      phone: '+91 9876543210',
    });
    ok('Returns 201', r.status === 201, `Got ${r.status}`);
    ok('User data returned', !!r.body.data?.user?.id);
    ok('Email normalized to lowercase', r.body.data?.user?.email === testEmail.toLowerCase());
    ok('Role is strictly CUSTOMER', r.body.data?.user?.role === 'CUSTOMER');
    ok('Password NOT returned in response', r.body.data?.user?.password === undefined);
    ok('JWT token returned', typeof r.body.data?.token === 'string');
    ok('HttpOnly cookie set in response', !!r.headers['set-cookie']?.some((c) => c.includes('token=')));

    customerUser = r.body.data.user;
    customerToken = r.body.data.token;
    cookieHeader = r.headers['set-cookie']?.[0]?.split(';')[0];

    // 3. Verify user cart and wishlist automatically initialized in DB
    console.log('\n--- 3. Database verification: cart & wishlist created ---');
    const userCart = await prisma.carts.findUnique({ where: { user_id: customerUser.id } });
    const userWishlist = await prisma.wishlists.findUnique({ where: { user_id: customerUser.id } });
    ok('User cart exists in database', !!userCart);
    ok('User wishlist exists in database', !!userWishlist);

    // 4. Duplicate email prevention
    console.log('\n--- 4. Public: Duplicate registration attempt ---');
    r = await req('POST', '/api/auth/register', {
      name: 'Duplicate User',
      email: testEmail.toUpperCase(), // case-insensitive check
      password: 'SecurePassword123!',
    });
    ok('Returns 409', r.status === 409);
    ok('Code is DUPLICATE_EMAIL', r.body.code === 'DUPLICATE_EMAIL');

    // 5. Login with invalid password (generic message)
    console.log('\n--- 5. Public: Login with wrong password ---');
    r = await req('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword999!',
    });
    ok('Returns 401', r.status === 401);
    ok('Generic error message returned', r.body.message === 'Invalid email or password');

    // 6. Login with nonexistent email (generic message)
    console.log('\n--- 6. Public: Login with nonexistent email ---');
    r = await req('POST', '/api/auth/login', {
      email: 'nonexistent_account_12345@test.com',
      password: 'AnyPassword123!',
    });
    ok('Returns 401', r.status === 401);
    ok('Generic error message returned', r.body.message === 'Invalid email or password');

    // 7. Successful login
    console.log('\n--- 7. Public: Successful login ---');
    r = await req('POST', '/api/auth/login', {
      email: testEmail,
      password: 'SecurePassword123!',
    });
    ok('Returns 200', r.status === 200);
    ok('Token returned', !!r.body.data?.token);
    ok('User returned without password', r.body.data?.user?.password === undefined);

    // 8. Authenticated GET /api/auth/me via Bearer token
    console.log('\n--- 8. Authenticated: GET /api/auth/me via Bearer ---');
    r = await req('GET', '/api/auth/me', null, customerToken);
    ok('Returns 200', r.status === 200);
    ok('Profile matches user', r.body.data?.id === customerUser.id);
    ok('Phone matches', r.body.data?.phone === '+91 9876543210');

    // 9. Authenticated GET /api/auth/me via Cookie
    console.log('\n--- 9. Authenticated: GET /api/auth/me via Cookie ---');
    r = await req('GET', '/api/auth/me', null, null, cookieHeader);
    ok('Returns 200 via cookie', r.status === 200);
    ok('Cookie profile matches user', r.body.data?.id === customerUser.id);

    // 10. Update profile
    console.log('\n--- 10. Authenticated: PATCH /api/auth/me ---');
    r = await req('PATCH', '/api/auth/me', {
      name: 'Fatima Khan',
      phone: '+91 9123456789',
    }, customerToken);
    ok('Returns 200', r.status === 200);
    ok('Name updated', r.body.data?.name === 'Fatima Khan');
    ok('Phone updated', r.body.data?.phone === '+91 9123456789');

    // 11. Change password with incorrect current password
    console.log('\n--- 11. Authenticated: Change password with wrong current ---');
    r = await req('POST', '/api/auth/change-password', {
      current_password: 'IncorrectCurrentPassword123!',
      new_password: 'NewSecurePassword456!',
    }, customerToken);
    ok('Returns 400', r.status === 400);
    ok('Code is INVALID_CURRENT_PASSWORD', r.body.code === 'INVALID_CURRENT_PASSWORD');

    // 12. Change password successfully
    console.log('\n--- 12. Authenticated: Change password successfully ---');
    r = await req('POST', '/api/auth/change-password', {
      current_password: 'SecurePassword123!',
      new_password: 'NewSecurePassword456!',
    }, customerToken);
    ok('Returns 200', r.status === 200);

    // 13. Verify old password fails
    console.log('\n--- 13. Verify login fails with old password ---');
    r = await req('POST', '/api/auth/login', {
      email: testEmail,
      password: 'SecurePassword123!',
    });
    ok('Old password rejected (401)', r.status === 401);

    // 14. Verify login succeeds with new password
    console.log('\n--- 14. Verify login succeeds with new password ---');
    r = await req('POST', '/api/auth/login', {
      email: testEmail,
      password: 'NewSecurePassword456!',
    });
    ok('New password accepted (200)', r.status === 200);

    // 15. Logout
    console.log('\n--- 15. Authenticated: POST /api/auth/logout ---');
    r = await req('POST', '/api/auth/logout', null, customerToken);
    ok('Returns 200', r.status === 200);
    ok('Clears cookie in header', !!r.headers['set-cookie']?.some((c) => c.includes('token=;')));

  } finally {
    console.log('\n  Cleanup: removing test user and records...');
    if (customerUser) {
      await prisma.wishlists.deleteMany({ where: { user_id: customerUser.id } }).catch(() => {});
      await prisma.carts.deleteMany({ where: { user_id: customerUser.id } }).catch(() => {});
      await prisma.users.delete({ where: { id: customerUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

