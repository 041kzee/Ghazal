/**
 * Generates a ready-to-import Postman Collection v2.1 JSON file
 * with automated token capture and pre-configured authorization.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'docs', 'Ghazal_Jewellery_Postman_Collection.json');

const autoTokenScript = [
  'if (pm.response.code === 200 || pm.response.code === 201) {',
  '    var json = pm.response.json();',
  '    if (json.data && json.data.token) {',
  '        pm.collectionVariables.set("token", json.data.token);',
  '        console.log("Token automatically saved to collection variable: token");',
  '    }',
  '}',
];

const collection = {
  info: {
    name: 'Ghazal Jewellery API',
    description: 'Complete Postman Collection for Ghazal Jewellery E-Commerce REST API.\n\nAll endpoints pre-configured with environment variables, request bodies, and automatic JWT token handling.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000/api', type: 'string' },
    { key: 'token', value: '', type: 'string' },
    { key: 'adminToken', value: '', type: 'string' },
  ],
  item: [
    // ── 1. System / Health ──
    {
      name: '1. System / Health',
      item: [
        {
          name: 'Health Check',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/health', host: ['{{baseUrl}}'], path: ['health'] },
            description: 'Check API and Supabase database connectivity.',
          },
        },
      ],
    },

    // ── 2. Authentication ──
    {
      name: '2. Authentication',
      item: [
        {
          name: 'Register Customer',
          event: [
            {
              listen: 'test',
              script: { type: 'text/javascript', exec: autoTokenScript },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  name: 'Amina Begum',
                  email: 'amina@example.com',
                  password: 'SecurePassword123!',
                  phone: '+91 9876543210',
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/auth/register', host: ['{{baseUrl}}'], path: ['auth', 'register'] },
            description: 'Register customer account. Automatically saves JWT token to {{token}} variable.',
          },
        },
        {
          name: 'Login Customer',
          event: [
            {
              listen: 'test',
              script: { type: 'text/javascript', exec: autoTokenScript },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  email: 'amina@example.com',
                  password: 'SecurePassword123!',
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/auth/login', host: ['{{baseUrl}}'], path: ['auth', 'login'] },
            description: 'Login customer. Automatically saves JWT token to {{token}} variable.',
          },
        },
        {
          name: 'Login Admin',
          event: [
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                exec: [
                  'if (pm.response.code === 200) {',
                  '    var json = pm.response.json();',
                  '    if (json.data && json.data.token) {',
                  '        pm.collectionVariables.set("adminToken", json.data.token);',
                  '        console.log("Admin token saved to collection variable: adminToken");',
                  '    }',
                  '}',
                ],
              },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  email: 'admin@ghazal.com',
                  password: 'AdminPassword123!',
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/auth/login', host: ['{{baseUrl}}'], path: ['auth', 'login'] },
            description: 'Login admin. Automatically saves token to {{adminToken}} variable.',
          },
        },
        {
          name: 'Get Current Profile (Me)',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/auth/me', host: ['{{baseUrl}}'], path: ['auth', 'me'] },
          },
        },
        {
          name: 'Update Profile',
          request: {
            method: 'PATCH',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ name: 'Amina Khan', phone: '+91 9123456789' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/auth/me', host: ['{{baseUrl}}'], path: ['auth', 'me'] },
          },
        },
        {
          name: 'Change Password',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  current_password: 'SecurePassword123!',
                  new_password: 'NewSecurePassword456!',
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/auth/change-password', host: ['{{baseUrl}}'], path: ['auth', 'change-password'] },
          },
        },
        {
          name: 'Logout',
          request: {
            method: 'POST',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/auth/logout', host: ['{{baseUrl}}'], path: ['auth', 'logout'] },
          },
        },
      ],
    },

    // ── 3. Categories (Public) ──
    {
      name: '3. Categories (Public)',
      item: [
        {
          name: 'List Active Categories',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/categories', host: ['{{baseUrl}}'], path: ['categories'] },
          },
        },
        {
          name: 'Get Category by Slug',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/categories/necklaces', host: ['{{baseUrl}}'], path: ['categories', 'necklaces'] },
          },
        },
      ],
    },

    // ── 4. Products (Public) ──
    {
      name: '4. Products (Public)',
      item: [
        {
          name: 'List Products (Search & Filter)',
          request: {
            method: 'GET',
            url: {
              raw: '{{baseUrl}}/products?page=1&limit=20&search=&category=&material=&min_price=&max_price=&in_stock=&sort_by=newest',
              host: ['{{baseUrl}}'],
              path: ['products'],
              query: [
                { key: 'page', value: '1' },
                { key: 'limit', value: '20' },
                { key: 'search', value: '' },
                { key: 'category', value: '' },
                { key: 'material', value: '' },
                { key: 'min_price', value: '' },
                { key: 'max_price', value: '' },
                { key: 'in_stock', value: '' },
                { key: 'sort_by', value: 'newest' },
              ],
            },
          },
        },
        {
          name: 'Featured Products',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/products/featured', host: ['{{baseUrl}}'], path: ['products', 'featured'] },
          },
        },
        {
          name: 'Get Product by Slug',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/products/slug/noor-emerald-necklace', host: ['{{baseUrl}}'], path: ['products', 'slug', 'noor-emerald-necklace'] },
          },
        },
        {
          name: 'Get Product by ID',
          request: {
            method: 'GET',
            url: { raw: '{{baseUrl}}/products/:id', host: ['{{baseUrl}}'], path: ['products', ':id'] },
          },
        },
      ],
    },

    // ── 5. Delivery Addresses ──
    {
      name: '5. Delivery Addresses',
      item: [
        {
          name: 'List Addresses',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/addresses', host: ['{{baseUrl}}'], path: ['addresses'] },
          },
        },
        {
          name: 'Create Address',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  full_name: 'Amina Begum',
                  phone: '+91 9876543210',
                  address_line1: 'Flat 402, Royal Residency',
                  city: 'Hyderabad',
                  state: 'Telangana',
                  pincode: '500034',
                  country: 'India',
                  is_default: true,
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/addresses', host: ['{{baseUrl}}'], path: ['addresses'] },
          },
        },
        {
          name: 'Update Address',
          request: {
            method: 'PATCH',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ address_line1: 'Updated House 123' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/addresses/:id', host: ['{{baseUrl}}'], path: ['addresses', ':id'] },
          },
        },
        {
          name: 'Set Default Address',
          request: {
            method: 'PATCH',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/addresses/:id/default', host: ['{{baseUrl}}'], path: ['addresses', ':id', 'default'] },
          },
        },
        {
          name: 'Delete Address',
          request: {
            method: 'DELETE',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/addresses/:id', host: ['{{baseUrl}}'], path: ['addresses', ':id'] },
          },
        },
      ],
    },

    // ── 6. Shopping Cart ──
    {
      name: '6. Shopping Cart',
      item: [
        {
          name: 'Get Cart',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/cart', host: ['{{baseUrl}}'], path: ['cart'] },
          },
        },
        {
          name: 'Add Item to Cart',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ variant_id: 'PASTE_VARIANT_UUID_HERE', quantity: 1 }, null, 2),
            },
            url: { raw: '{{baseUrl}}/cart/items', host: ['{{baseUrl}}'], path: ['cart', 'items'] },
          },
        },
        {
          name: 'Update Cart Item Quantity',
          request: {
            method: 'PATCH',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ quantity: 2 }, null, 2),
            },
            url: { raw: '{{baseUrl}}/cart/items/:id', host: ['{{baseUrl}}'], path: ['cart', 'items', ':id'] },
          },
        },
        {
          name: 'Remove Item from Cart',
          request: {
            method: 'DELETE',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/cart/items/:id', host: ['{{baseUrl}}'], path: ['cart', 'items', ':id'] },
          },
        },
        {
          name: 'Clear Entire Cart',
          request: {
            method: 'DELETE',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/cart', host: ['{{baseUrl}}'], path: ['cart'] },
          },
        },
      ],
    },

    // ── 7. Wishlist ──
    {
      name: '7. Wishlist',
      item: [
        {
          name: 'Get Wishlist',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/wishlist', host: ['{{baseUrl}}'], path: ['wishlist'] },
          },
        },
        {
          name: 'Add Product to Wishlist',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ product_id: 'PASTE_PRODUCT_UUID_HERE' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/wishlist/items', host: ['{{baseUrl}}'], path: ['wishlist', 'items'] },
          },
        },
        {
          name: 'Remove Product from Wishlist',
          request: {
            method: 'DELETE',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/wishlist/items/:productId', host: ['{{baseUrl}}'], path: ['wishlist', 'items', ':productId'] },
          },
        },
      ],
    },

    // ── 8. Orders & Checkout ──
    {
      name: '8. Orders & Checkout',
      item: [
        {
          name: 'Place Order (From Cart)',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  address_id: 'PASTE_ADDRESS_UUID_HERE',
                  use_cart: true,
                  payment_method: 'ONLINE',
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/orders', host: ['{{baseUrl}}'], path: ['orders'] },
          },
        },
        {
          name: 'Place Direct Order (Without Cart)',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  shipping_address: {
                    full_name: 'Direct Customer',
                    phone: '+91 9876543210',
                    address_line1: 'Road No 10, Banjara Hills',
                    city: 'Hyderabad',
                    state: 'Telangana',
                    pincode: '500034',
                    country: 'India',
                  },
                  use_cart: false,
                  items: [{ variant_id: 'PASTE_VARIANT_UUID_HERE', quantity: 1 }],
                  payment_method: 'COD',
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/orders', host: ['{{baseUrl}}'], path: ['orders'] },
          },
        },
        {
          name: 'My Orders',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/orders/my-orders?page=1&limit=20', host: ['{{baseUrl}}'], path: ['orders', 'my-orders'] },
          },
        },
        {
          name: 'Get Order by ID',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/orders/:id', host: ['{{baseUrl}}'], path: ['orders', ':id'] },
          },
        },
        {
          name: 'Cancel Order',
          request: {
            method: 'POST',
            header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            url: { raw: '{{baseUrl}}/orders/:id/cancel', host: ['{{baseUrl}}'], path: ['orders', ':id', 'cancel'] },
          },
        },
      ],
    },

    // ── 9. Admin Dashboard & Management ──
    {
      name: '9. Admin Operations',
      item: [
        {
          name: 'Dashboard Summary',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{adminToken}}' }],
            url: { raw: '{{baseUrl}}/admin/dashboard/summary', host: ['{{baseUrl}}'], path: ['admin', 'dashboard', 'summary'] },
          },
        },
        {
          name: 'Recent Orders',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{adminToken}}' }],
            url: { raw: '{{baseUrl}}/admin/dashboard/recent-orders', host: ['{{baseUrl}}'], path: ['admin', 'dashboard', 'recent-orders'] },
          },
        },
        {
          name: 'Low Stock Inventory Alerts',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{adminToken}}' }],
            url: { raw: '{{baseUrl}}/admin/dashboard/low-stock?threshold=5', host: ['{{baseUrl}}'], path: ['admin', 'dashboard', 'low-stock'] },
          },
        },
        {
          name: 'List Customers',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{adminToken}}' }],
            url: { raw: '{{baseUrl}}/admin/customers?page=1&limit=20', host: ['{{baseUrl}}'], path: ['admin', 'customers'] },
          },
        },
        {
          name: 'List All Orders (Admin)',
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{adminToken}}' }],
            url: { raw: '{{baseUrl}}/admin/orders?page=1&limit=20&status=', host: ['{{baseUrl}}'], path: ['admin', 'orders'] },
          },
        },
        {
          name: 'Update Order Status',
          request: {
            method: 'PATCH',
            header: [
              { key: 'Authorization', value: 'Bearer {{adminToken}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ status: 'CONFIRMED' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/admin/orders/:id/status', host: ['{{baseUrl}}'], path: ['admin', 'orders', ':id', 'status'] },
          },
        },
        {
          name: 'Create Product (Admin)',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{adminToken}}' },
              { key: 'Content-Type', value: 'application/json' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                {
                  name: 'Royal Heritage Emerald Choker',
                  description: 'Authentic 22k gold choker with Zambian emeralds',
                  sku: 'GZ-CHK-001',
                  material: '22k Gold',
                  is_featured: true,
                  category_id: 'PASTE_CATEGORY_UUID_HERE',
                  variants: [
                    {
                      sku: 'GZ-CHK-001-STD',
                      size: 'Standard',
                      material: '22k Gold',
                      price_paise: 8500000,
                      stock: 5,
                    },
                  ],
                  images: [
                    {
                      image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
                      alt_text: 'Emerald Choker Front',
                      is_primary: true,
                    },
                  ],
                },
                null,
                2
              ),
            },
            url: { raw: '{{baseUrl}}/admin/products', host: ['{{baseUrl}}'], path: ['admin', 'products'] },
          },
        },
      ],
    },
  ],
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection, null, 2), 'utf-8');
console.log(`✅ Postman Collection generated at: ${OUTPUT_PATH}`);

