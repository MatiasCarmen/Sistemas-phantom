import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const isolatedDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-auth-pricing-'));
const snapshot = JSON.parse(fs.readFileSync(path.resolve('data/db.json'), 'utf8'));
delete snapshot.users;
fs.writeFileSync(path.join(isolatedDataDir, 'db.json'), JSON.stringify(snapshot, null, 2));
fs.copyFileSync(path.resolve('data/audit.json'), path.join(isolatedDataDir, 'audit.json'));
process.env.PHANTOM_DATA_DIR = isolatedDataDir;
process.env.MONGODB_DATABASE = `phantom_erp_auth_pricing_${randomUUID().replaceAll('-', '')}`;
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
process.env.FRONTEND_URL = 'http://localhost:5173';

const { createApp } = await import('./app.ts');
const { db } = await import('./dataStore.ts');

let server;
let baseUrl;
let mongo;
const tokens = {};

async function request(pathname, options = {}, expectedStatus) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (expectedStatus !== undefined) {
    assert.equal(response.status, expectedStatus, JSON.stringify(body));
  } else {
    assert.ok(response.ok, `${options.method || 'GET'} ${pathname}: ${JSON.stringify(body)}`);
  }
  return body;
}

before(async () => {
  await db.initialize();
  server = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
  await mongo.connect();
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await db.close();
  assert.match(process.env.MONGODB_DATABASE, /^phantom_erp_(controlled|auth_pricing)_[a-f0-9]{32}$/);
  await mongo.db(process.env.MONGODB_DATABASE).dropDatabase();
  await mongo.close();
  fs.rmSync(isolatedDataDir, { recursive: true, force: true });
});

test('distingue autenticación, permisos y calcula importes desde el catálogo', async () => {
  await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'jperez', password: 'incorrecta' })
  }, 401);

  await request('/sales', {}, 401);

  for (const [key, credentials] of Object.entries({
    admin: ['jperez', 'admin'],
    seller: ['mgarcia', 'carlos123'],
    warehouse: ['lrojas', 'rosa123'],
    cashier: ['cvasquez', 'ana123']
  })) {
    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: credentials[0], password: credentials[1] })
    });
    tokens[key] = login.token;
  }

  await request('/sales', { token: tokens.warehouse }, 403);
  await request('/stock-transfers', { method: 'POST', token: tokens.seller, body: JSON.stringify({}) }, 403);

  const productResponse = await request('/products', {
    method: 'POST',
    token: tokens.admin,
    body: JSON.stringify({
      name: 'Producto de autorización',
      sku: `AUTH-${Date.now()}`,
      category: 'Pruebas',
      costPrice: 10,
      sellingPrice: 20,
      taxRate: 18,
      stock: 5,
      minStock: 1,
      unit: 'UND'
    })
  });
  const product = productResponse.data;
  const item = {
    productId: product.id,
    quantity: 2,
    unitPrice: 9999,
    subtotal: 9999,
    taxAmount: 9999,
    total: 99999,
    discountPercent: 0
  };

  const invalidQuantity = await request('/sales', {
    method: 'POST',
    token: tokens.cashier,
    body: JSON.stringify({
      customerName: 'Cliente de prueba',
      items: [{ ...item, quantity: -1 }]
    })
  }, 400);
  assert.match(invalidQuantity.error, /Cantidad inválida/);

  const saleResponse = await request('/sales', {
    method: 'POST',
    token: tokens.cashier,
    body: JSON.stringify({
      customerName: 'Cliente de prueba',
      items: [item],
      subtotal: 9999,
      taxTotal: 9999,
      total: 99999
    })
  });
  assert.equal(saleResponse.data.items[0].unitPrice, 20);
  assert.equal(saleResponse.data.subtotal, 33.9);
  assert.equal(saleResponse.data.taxTotal, 6.1);
  assert.equal(saleResponse.data.total, 40);
  assert.equal(saleResponse.data.discountTotal, 0);

  await db.flushPersistence();
  const database = mongo.db(process.env.MONGODB_DATABASE);
  const storedSale = await database.collection('sales').findOne({ _id: saleResponse.data.id });
  const storedProduct = await database.collection('products').findOne({ _id: product.id });
  assert.equal(storedSale.total, 40);
  assert.equal(storedProduct.stock, 3);
});
