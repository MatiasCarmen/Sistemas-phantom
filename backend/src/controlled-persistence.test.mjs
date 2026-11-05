import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const isolatedDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-controlled-'));
const isolatedSnapshot = JSON.parse(fs.readFileSync(path.resolve('data/db.json'), 'utf8'));
delete isolatedSnapshot.users;
fs.writeFileSync(path.join(isolatedDataDir, 'db.json'), JSON.stringify(isolatedSnapshot, null, 2));
fs.copyFileSync(path.resolve('data/audit.json'), path.join(isolatedDataDir, 'audit.json'));
process.env.PHANTOM_DATA_DIR = isolatedDataDir;
process.env.MONGODB_DATABASE = `phantom_erp_controlled_${randomUUID().replaceAll('-', '')}`;
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
process.env.FRONTEND_URL = 'http://localhost:5173';

const { createApp } = await import('./app.ts');
const { db } = await import('./dataStore.ts');

let server;
let baseUrl;
let token;
let productId;
let mongo;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  assert.ok(response.ok, `${options.method || 'GET'} ${pathname}: ${JSON.stringify(body)}`);
  return body.data ?? body;
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

test('persiste el flujo controlado en MongoDB y lo recupera tras reiniciar', async () => {
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'jperez', password: 'admin' }),
    headers: {}
  });
  token = login.token;
  assert.ok(token);

  const product = await request('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Producto de prueba controlada',
      sku: `CONTROL-${Date.now()}`,
      category: 'Pruebas',
      costPrice: 10,
      sellingPrice: 20,
      stock: 5,
      minStock: 1,
      unit: 'UND'
    })
  });
  productId = product.id;

  await request('/products/adjust-stock', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      type: 'IN_ADJUSTMENT',
      quantity: 3,
      notes: 'Entrada controlada',
      createdBy: 'Prueba automatizada'
    })
  });

  const customer = await request('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Cliente de prueba controlada', taxId: `T${Date.now()}`, email: '', phone: '' })
  });

  const item = {
    id: `test-item-${Date.now()}`,
    productId,
    sku: product.sku,
    name: product.name,
    unit: 'UND',
    unitPrice: 20,
    costPrice: 10,
    quantity: 2,
    discountPercent: 0,
    taxRate: 18,
    subtotal: 33.9,
    taxAmount: 6.1,
    total: 40
  };
  await request('/quotes', {
    method: 'POST',
    body: JSON.stringify({
      customerId: customer.id,
      customerName: customer.name,
      customerTaxId: customer.taxId,
      items: [item],
      subtotal: 33.9,
      discountTotal: 0,
      taxTotal: 6.1,
      total: 40
    })
  });

  const transfers = await request('/stock-transfers', {
    method: 'POST',
    body: JSON.stringify({ productId, toStoreId: 'store-01', quantity: 2, notes: 'Transferencia controlada' })
  });
  await request('/stock-transfers/receive', {
    method: 'POST',
    body: JSON.stringify({ guideNumber: transfers[0].guideNumber, storeId: 'store-01' })
  });

  const sale = await request('/sales', {
    method: 'POST',
    body: JSON.stringify({
      storeId: 'store-01',
      customerId: customer.id,
      customerName: customer.name,
      customerTaxId: customer.taxId,
      items: [item],
      subtotal: 33.9,
      discountTotal: 0,
      taxTotal: 6.1,
      total: 40,
      paidAmount: 40,
      dueAmount: 0
    })
  });
  assert.equal(sale.storeId, 'store-01');
  await db.flushPersistence();

  const database = mongo.db(process.env.MONGODB_DATABASE);
  const [storedProduct, storedSale, movement, storedCustomer, storedQuote] = await Promise.all([
    database.collection('products').findOne({ _id: productId }),
    database.collection('sales').findOne({ _id: sale.id }),
    database.collection('inventory_movements').findOne({ referenceId: sale.saleNumber }),
    database.collection('customers').findOne({ _id: customer.id }),
    database.collection('quotes').findOne({ customerId: customer.id })
  ]);
  assert.equal(storedProduct.stock, 6);
  assert.equal(storedSale.storeId, 'store-01');
  assert.equal(await database.collection('store_stock').findOne({ _id: `store-01::${productId}` }).then(stock => stock.quantity), 0);
  assert.equal(movement.type, 'OUT_SALE');
  assert.equal(storedCustomer._id, customer.id);
  assert.equal(storedQuote.customerId, customer.id);

  await new Promise(resolve => server.close(resolve));
  await db.close();
  await db.initialize();
  server = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const recovered = await request(`/products/${productId}`);
  assert.equal(recovered.stock, 6);
});
