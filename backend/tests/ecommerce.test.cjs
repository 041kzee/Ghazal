/**
 * Comprehensive E-Commerce Lifecycle Integration Test Suite.
 * Tests Addresses, Wishlist, Cart, Checkout, Stock Decrement, Order Status, Inventory Restoration, and Admin Dashboard.
 */
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

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
        resolve({ status: res.statusCode, body: p });
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
  const ts = Date.now();
  let adminUser, adminToken;
  let customerUser, customerToken;
  let testCategory, testProduct, testVariant;
  let createdAddress1, createdAddress2;
  let placedOrderId;

  try {
    console.log('\n=== COMPLETE E-COMMERCE LIFECYCLE TESTS ===\n');

    // ── Setup: Admin user, Category, Product with initial stock ──
    const pw = await bcrypt.hash('Secret1234!', 10);
    adminUser = await prisma.users.create({
      data: { name: 'Super Admin', email: `admin_${ts}@ghazal.test`, password: pw, role: 'ADMIN' },
    });

    // Admin login
    let r = await req('POST', '/api/auth/login', {
      email: adminUser.email,
      password: 'Secret1234!',
    });
    adminToken = r.body.data.token;
    ok('Admin login successful', !!adminToken);

    testCategory = await prisma.categories.create({
      data: { name: 'Earrings', slug: `earrings-${ts}` },
    });

    testProduct = await prisma.products.create({
      data: {
        name: 'Jodha Pearl Jhumkas',
        slug: `jodha-pearl-jhumkas-${ts}`,
        sku: `SKU-JHM-${ts}`,
        material: '18k Gold & Freshwater Pearl',
        category_id: testCategory.id,
      },
    });

    // Variant with initial stock of 5
    testVariant = await prisma.product_variants.create({
      data: {
        product_id: testProduct.id,
        sku: `SKU-JHM-${ts}-STD`,
        price_paise: 1500000, // 15,000 INR
        stock: 5,
      },
    });
    console.log('  Setup complete: Product variant created with stock = 5\n');

    // ── 1. Customer Registration ──
    console.log('--- 1. Customer Registration ---');
    r = await req('POST', '/api/auth/register', {
      name: 'Amina Begum',
      email: `customer_${ts}@ghazal.test`,
      password: 'CustomerPassword123!',
      phone: '+91 9988776655',
    });
    ok('Customer registered', r.status === 201);
    customerUser = r.body.data.user;
    customerToken = r.body.data.token;

    // ── 2. Address Management ──
    console.log('\n--- 2. Address Management ---');
    // First address: automatically default
    r = await req('POST', '/api/addresses', {
      full_name: 'Amina Begum',
      phone: '+91 9988776655',
      address_line1: 'Flat 402, Royal Residency',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
    }, customerToken);
    ok('First address created', r.status === 201);
    ok('First address auto-marked default', r.body.data?.is_default === true);
    createdAddress1 = r.body.data;

    // Second address: not default
    r = await req('POST', '/api/addresses', {
      full_name: 'Amina Begum (Office)',
      phone: '+91 9988776655',
      address_line1: 'Banjara Hills Road No 12',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
      is_default: false,
    }, customerToken);
    ok('Second address created as non-default', r.body.data?.is_default === false);
    createdAddress2 = r.body.data;

    // Promote second address to default
    r = await req('PATCH', `/api/addresses/${createdAddress2.id}/default`, null, customerToken);
    ok('Set default address successful', r.status === 200 && r.body.data?.is_default === true);

    // Verify first address is now NOT default
    const addr1InDb = await prisma.addresses.findUnique({ where: { id: createdAddress1.id } });
    ok('Previous default unset automatically', addr1InDb.is_default === false);

    // ── 3. Wishlist Management ──
    console.log('\n--- 3. Wishlist Operations ---');
    r = await req('POST', '/api/wishlist/items', { product_id: testProduct.id }, customerToken);
    ok('Added to wishlist', r.status === 201);
    ok('Wishlist item count is 1', r.body.data?.item_count === 1);

    // Idempotent duplicate check
    r = await req('POST', '/api/wishlist/items', { product_id: testProduct.id }, customerToken);
    ok('Duplicate wishlist add handled idempotently', r.body.data?.item_count === 1);

    // Fetch wishlist
    r = await req('GET', '/api/wishlist', null, customerToken);
    ok('Fetch wishlist successful', r.body.data?.items?.length === 1);

    // ── 4. Cart Operations & Stock Validation ──
    console.log('\n--- 4. Cart Operations & Inventory Validation ---');
    // Add 2 items to cart
    r = await req('POST', '/api/cart/items', { variant_id: testVariant.id, quantity: 2 }, customerToken);
    ok('Added 2 items to cart', r.status === 201);
    ok('Cart total quantity = 2', r.body.data?.summary?.total_quantity === 2);
    ok('Subtotal calculated accurately', r.body.data?.summary?.subtotal_paise === 3000000); // 30,000 INR

    // Attempt to add 10 more (stock is only 5)
    r = await req('POST', '/api/cart/items', { variant_id: testVariant.id, quantity: 10 }, customerToken);
    ok('Rejects quantity exceeding stock (400)', r.status === 400);
    ok('Code is INSUFFICIENT_STOCK', r.body.code === 'INSUFFICIENT_STOCK');

    // Update quantity in cart to 3
    const cartItemId = r.body.data ? r.body.data.items[0].id : (await req('GET', '/api/cart', null, customerToken)).body.data.items[0].id;
    r = await req('PATCH', `/api/cart/items/${cartItemId}`, { quantity: 3 }, customerToken);
    ok('Cart quantity updated to 3', r.body.data?.summary?.total_quantity === 3);

    // ── 5. Checkout / Order Placement ──
    console.log('\n--- 5. Order Placement (Checkout) ---');
    r = await req('POST', '/api/orders', {
      address_id: createdAddress2.id,
      use_cart: true,
      payment_method: 'ONLINE',
    }, customerToken);
    ok('Order placed successfully (201)', r.status === 201);
    ok('Order number generated', typeof r.body.data?.order_number === 'string');
    ok('Initial order status is PENDING', r.body.data?.status === 'PENDING');
    ok('Total amount calculated on server', r.body.data?.total_amount_paise > 0);
    ok('Immutable shipping address stored', r.body.data?.shipping_address?.city === 'Hyderabad');
    ok('Immutable order items stored', r.body.data?.order_items?.length === 1);
    ok('Payment record created (PENDING)', r.body.data?.payments?.length === 1);
    placedOrderId = r.body.data?.id;

    // Verify cart is now empty after checkout
    r = await req('GET', '/api/cart', null, customerToken);
    ok('Cart cleared after checkout', r.body.data?.items?.length === 0);

    // Verify stock was decremented from 5 to 2!
    const variantAfterOrder = await prisma.product_variants.findUnique({ where: { id: testVariant.id } });
    ok('Stock decremented in DB (5 - 3 = 2)', variantAfterOrder.stock === 2);

    // ── 6. Customer Order View ──
    console.log('\n--- 6. Customer View My Orders ---');
    r = await req('GET', '/api/orders/my-orders', null, customerToken);
    ok('Customer lists their orders', r.body.data?.length === 1);

    r = await req('GET', `/api/orders/${placedOrderId}`, null, customerToken);
    ok('Customer views order details', r.body.data?.id === placedOrderId);

    // ── 7. Customer Order Cancellation & Inventory Restoration ──
    console.log('\n--- 7. Order Cancellation & Stock Restoration ---');
    r = await req('POST', `/api/orders/${placedOrderId}/cancel`, null, customerToken);
    ok('Order cancelled successfully', r.status === 200 && r.body.data?.status === 'CANCELLED');

    // Verify stock is RESTORED back to 5!
    const variantAfterCancel = await prisma.product_variants.findUnique({ where: { id: testVariant.id } });
    ok('Stock restored in DB (2 + 3 = 5)', variantAfterCancel.stock === 5);

    // ── 8. Direct Checkout (Without Cart) & Admin Status Transitions ──
    console.log('\n--- 8. Direct Checkout & Admin Status Lifecycle ---');
    r = await req('POST', '/api/orders', {
      shipping_address: {
        full_name: 'Direct Buyer',
        phone: '+91 9123456780',
        address_line1: 'Jubilee Hills Checkpost',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033',
      },
      use_cart: false,
      items: [{ variant_id: testVariant.id, quantity: 1 }],
      payment_method: 'COD',
    }, customerToken);
    ok('Direct order placed (201)', r.status === 201);
    const directOrderId = r.body.data?.id;

    // Admin transitions: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
    r = await req('PATCH', `/api/admin/orders/${directOrderId}/status`, { status: 'CONFIRMED' }, adminToken);
    ok('Status updated to CONFIRMED', r.body.data?.status === 'CONFIRMED');

    r = await req('PATCH', `/api/admin/orders/${directOrderId}/status`, { status: 'PROCESSING' }, adminToken);
    ok('Status updated to PROCESSING', r.body.data?.status === 'PROCESSING');

    r = await req('PATCH', `/api/admin/orders/${directOrderId}/status`, { status: 'SHIPPED' }, adminToken);
    ok('Status updated to SHIPPED', r.body.data?.status === 'SHIPPED');

    r = await req('PATCH', `/api/admin/orders/${directOrderId}/status`, { status: 'DELIVERED' }, adminToken);
    ok('Status updated to DELIVERED', r.body.data?.status === 'DELIVERED');

    // Attempt illegal transition from DELIVERED -> PENDING
    r = await req('PATCH', `/api/admin/orders/${directOrderId}/status`, { status: 'PENDING' }, adminToken);
    ok('Illegal status jump rejected (400)', r.status === 400);
    ok('Code is INVALID_STATUS_TRANSITION', r.body.code === 'INVALID_STATUS_TRANSITION');

    // ── 9. Admin Dashboard & Metrics ──
    console.log('\n--- 9. Admin Dashboard Metrics ---');
    r = await req('GET', '/api/admin/dashboard/summary', null, adminToken);
    ok('Dashboard summary returns metrics', r.status === 200);
    ok('Total orders count > 0', r.body.data?.total_orders >= 2);
    ok('Delivered orders count >= 1', r.body.data?.delivered_orders >= 1);
    ok('Revenue metric computed in paise', typeof r.body.data?.total_revenue_paise === 'number');

    r = await req('GET', '/api/admin/dashboard/recent-orders', null, adminToken);
    ok('Recent orders list returned', Array.isArray(r.body.data) && r.body.data.length >= 2);

    r = await req('GET', '/api/admin/dashboard/low-stock?threshold=10', null, adminToken);
    ok('Low stock inventory list returned', Array.isArray(r.body.data));

    r = await req('GET', '/api/admin/customers', null, adminToken);
    ok('Customers list returned with order counts', Array.isArray(r.body.data) && r.body.data.length >= 1);

    r = await req('GET', '/api/admin/products', null, adminToken);
    ok('Admin products list returned', Array.isArray(r.body.data) && r.body.data.length >= 1);

  } finally {
    console.log('\n  Cleanup: removing test orders, items, users...');
    await prisma.payments.deleteMany({
      where: { orders: { user_id: { in: [customerUser?.id, adminUser?.id].filter(Boolean) } } },
    }).catch(() => {});
    await prisma.order_items.deleteMany({
      where: { orders: { user_id: { in: [customerUser?.id, adminUser?.id].filter(Boolean) } } },
    }).catch(() => {});
    await prisma.orders.deleteMany({
      where: { user_id: { in: [customerUser?.id, adminUser?.id].filter(Boolean) } },
    }).catch(() => {});
    await prisma.cart_items.deleteMany({
      where: { carts: { user_id: customerUser?.id } },
    }).catch(() => {});
    await prisma.wishlist_items.deleteMany({
      where: { wishlists: { user_id: customerUser?.id } },
    }).catch(() => {});
    await prisma.carts.deleteMany({
      where: { user_id: customerUser?.id },
    }).catch(() => {});
    await prisma.wishlists.deleteMany({
      where: { user_id: customerUser?.id },
    }).catch(() => {});
    await prisma.addresses.deleteMany({
      where: { user_id: customerUser?.id },
    }).catch(() => {});
    if (testVariant) {
      await prisma.product_variants.deleteMany({ where: { product_id: testProduct?.id } }).catch(() => {});
    }
    if (testProduct) {
      await prisma.products.delete({ where: { id: testProduct.id } }).catch(() => {});
    }
    if (testCategory) {
      await prisma.categories.delete({ where: { id: testCategory.id } }).catch(() => {});
    }
    if (customerUser) {
      await prisma.users.delete({ where: { id: customerUser.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.users.delete({ where: { id: adminUser.id } }).catch(() => {});
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
