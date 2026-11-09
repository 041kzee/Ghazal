/**
 * Product Module End-to-End Test Suite.
 */
const http = require('http');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'a08e4b9465bd2c5b871c55992e37b46d9a42d306796a8d2b7fc4b592349e6abdb206df6b6cb25b2bb8a16212e4caf1b5999ac1f485fd68994a6d22f1b040ad04';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

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
  let adminUser, adminToken, testCategory, createdProductId;

  try {
    console.log('\n=== PRODUCT MODULE TESTS ===\n');

    // Setup: Admin user & category
    const pw = await bcrypt.hash('Admin1234!', 10);
    adminUser = await prisma.users.create({
      data: { name: 'Prod Admin', email: 'prodadmin@ghazal.test', password: pw, role: 'ADMIN' },
    });
    adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET, { expiresIn: '1h' });

    testCategory = await prisma.categories.create({
      data: { name: 'Necklaces', slug: 'necklaces', description: 'Royal necklaces' },
    });
    console.log('  Setup complete: created test admin and category\n');

    // 1. Public list empty
    console.log('--- 1. Public: GET /api/products (initial) ---');
    let r = await req('GET', '/api/products');
    ok('Returns 200', r.status === 200);
    ok('Data has items and meta', Array.isArray(r.body.data) && r.body.meta !== undefined);

    // 2. Admin create product with variants and images
    console.log('\n--- 2. Admin: POST /api/admin/products (complete creation) ---');
    const newProductPayload = {
      name: 'Noor Emerald Necklace',
      description: 'Handcrafted emerald necklace with 22k gold polish',
      sku: 'GZ-NCK-001',
      material: '22k Gold',
      is_featured: true,
      category_id: testCategory.id,
      variants: [
        {
          sku: 'GZ-NCK-001-S',
          size: 'Small',
          material: '22k Gold',
          price_paise: 2500000, // 25,000 INR
          stock: 10,
        },
        {
          sku: 'GZ-NCK-001-M',
          size: 'Medium',
          material: '22k Gold',
          price_paise: 3500000, // 35,000 INR
          stock: 5,
        },
      ],
      images: [
        {
          image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
          alt_text: 'Front view Noor Emerald Necklace',
          is_primary: true,
          display_order: 1,
        },
      ],
    };
    r = await req('POST', '/api/admin/products', newProductPayload, adminToken);
    ok('Returns 201', r.status === 201, `Got ${r.status}`);
    ok('Product created with ID', !!r.body.data?.id);
    ok('Auto slug created', r.body.data?.slug === 'noor-emerald-necklace');
    ok('2 variants attached', r.body.data?.product_variants?.length === 2);
    ok('1 image attached', r.body.data?.product_images?.length === 1);
    createdProductId = r.body.data?.id;

    // 3. Unique SKU constraint
    console.log('\n--- 3. Admin: POST duplicate SKU ---');
    r = await req('POST', '/api/admin/products', {
      name: 'Duplicate SKU Necklace',
      sku: 'GZ-NCK-001',
      category_id: testCategory.id,
    }, adminToken);
    ok('Returns 409 duplicate', r.status === 409);

    // 4. Public get by Slug
    console.log('\n--- 4. Public: GET /api/products/slug/:slug ---');
    r = await req('GET', '/api/products/slug/noor-emerald-necklace');
    ok('Returns 200', r.status === 200);
    ok('Found correct product', r.body.data?.name === 'Noor Emerald Necklace');
    ok('Category included', r.body.data?.categories?.name === 'Necklaces');

    // 5. Public get by ID
    console.log('\n--- 5. Public: GET /api/products/:id ---');
    r = await req('GET', `/api/products/${createdProductId}`);
    ok('Returns 200', r.status === 200);
    ok('ID matches', r.body.data?.id === createdProductId);

    // 6. Public featured
    console.log('\n--- 6. Public: GET /api/products/featured ---');
    r = await req('GET', '/api/products/featured');
    ok('Returns 200', r.status === 200);
    ok('Featured list contains product', r.body.data?.some((p) => p.id === createdProductId));

    // 7. Filtering and Searching
    console.log('\n--- 7. Public: Search and Filters ---');
    // Search match
    r = await req('GET', '/api/products?search=Emerald');
    ok('Search matches Noor Emerald', r.body.data?.length === 1);

    // Material match
    r = await req('GET', '/api/products?material=Gold');
    ok('Filter material matches', r.body.data?.length === 1);

    // In-stock match
    r = await req('GET', '/api/products?in_stock=true');
    ok('Filter in_stock matches', r.body.data?.length === 1);

    // Category match
    r = await req('GET', '/api/products?category=necklaces');
    ok('Filter category by slug matches', r.body.data?.length === 1);

    // 8. Admin: Add new variant
    console.log('\n--- 8. Admin: Add variant to product ---');
    r = await req('POST', `/api/admin/products/${createdProductId}/variants`, {
      sku: 'GZ-NCK-001-L',
      size: 'Large',
      price_paise: 4500000,
      stock: 2,
    }, adminToken);
    ok('Returns 201', r.status === 201);
    ok('Variant created', r.body.data?.sku === 'GZ-NCK-001-L');
    const newVariantId = r.body.data?.id;

    // 9. Admin: Update variant
    console.log('\n--- 9. Admin: Update variant ---');
    r = await req('PATCH', `/api/admin/products/${createdProductId}/variants/${newVariantId}`, {
      stock: 7,
    }, adminToken);
    ok('Returns 200', r.status === 200);
    ok('Variant stock updated', r.body.data?.stock === 7);

    // 10. Admin: Delete variant
    console.log('\n--- 10. Admin: Delete variant ---');
    r = await req('DELETE', `/api/admin/products/${createdProductId}/variants/${newVariantId}`, null, adminToken);
    ok('Returns 200', r.status === 200);

    // 11. Admin: Add image
    console.log('\n--- 11. Admin: Add image ---');
    r = await req('POST', `/api/admin/products/${createdProductId}/images`, {
      image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338',
      alt_text: 'Side view',
      display_order: 2,
    }, adminToken);
    ok('Returns 201', r.status === 201);
    const newImageId = r.body.data?.id;

    // 12. Admin: Delete image
    console.log('\n--- 12. Admin: Delete image ---');
    r = await req('DELETE', `/api/admin/products/${createdProductId}/images/${newImageId}`, null, adminToken);
    ok('Returns 200', r.status === 200);

    // 13. Admin: Toggle availability to inactive
    console.log('\n--- 13. Admin: Toggle availability & ensure hidden from public ---');
    r = await req('PATCH', `/api/admin/products/${createdProductId}/availability`, { is_active: false }, adminToken);
    ok('Returns 200', r.status === 200);
    ok('Product is inactive', r.body.data?.is_active === false);

    // Public list should now NOT include it
    r = await req('GET', '/api/products');
    ok('Inactive product hidden from public list', r.body.data?.length === 0);

    // Public slug lookup should return 404
    r = await req('GET', '/api/products/slug/noor-emerald-necklace');
    ok('Public slug lookup returns 404 for inactive', r.status === 404);

    // 14. Admin: Reactivate and Delete product
    console.log('\n--- 14. Admin: Delete product ---');
    r = await req('DELETE', `/api/admin/products/${createdProductId}`, null, adminToken);
    ok('Returns 200', r.status === 200);
    ok('Action is deleted', r.body.data?.action === 'deleted');
    createdProductId = null;

  } finally {
    console.log('\n  Cleanup: removing test data...');
    if (createdProductId) {
      await prisma.product_images.deleteMany({ where: { product_id: createdProductId } }).catch(() => {});
      await prisma.product_variants.deleteMany({ where: { product_id: createdProductId } }).catch(() => {});
      await prisma.products.delete({ where: { id: createdProductId } }).catch(() => {});
    }
    if (testCategory) {
      await prisma.categories.delete({ where: { id: testCategory.id } }).catch(() => {});
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
