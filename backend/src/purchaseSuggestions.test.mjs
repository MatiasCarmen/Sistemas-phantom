import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPurchaseSuggestions } from './purchaseSuggestions.ts';

const now = new Date('2026-11-12T12:00:00.000Z');
const product = {
  id: 'p1',
  name: 'Producto',
  sku: 'SKU-1',
  category: 'Periféricos',
  unit: 'UND',
  stock: 5,
  minStock: 3,
  maxStock: 10
};
const store = { id: 's1', name: 'Tienda 1', type: 'STORE', status: 'ACTIVE' };

function getSuggestions(overrides = {}) {
  return buildPurchaseSuggestions({
    products: [product],
    sales: [],
    orders: [],
    stores: [store],
    storeStock: [],
    transfers: [],
    now,
    ...overrides
  });
}

test('calculates purchasing needs for central safety stock and store demand', () => {
  const suggestions = getSuggestions({
    sales: [{
      id: 'sale1',
      date: '2026-11-10',
      createdAt: now.toISOString(),
      storeId: 's1',
      status: 'COMPLETED',
      items: [{ productId: 'p1', quantity: 30 }]
    }],
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 2 }],
    orders: [{
      id: 'order1',
      orderNumber: 'OC-1',
      supplierId: 'supplier1',
      supplierName: 'Proveedor',
      supplierTaxId: '123',
      date: '2026-11-01',
      status: 'ISSUED',
      items: [{ productId: 'p1', quantity: 4 }],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      currency: 'S/.',
      createdBy: 'test',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }]
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].recentSales, 30);
  assert.equal(suggestions[0].centralStock, 5);
  assert.equal(suggestions[0].storeDemand, 8);
  assert.equal(suggestions[0].openOrderQuantity, 4);
  assert.equal(suggestions[0].requestedQuantity, 9);
});

test('subtracts open orders and in-transit transfers and excludes cancelled sales', () => {
  const suggestions = getSuggestions({
    products: [{ ...product, stock: 10 }],
    sales: [{
      id: 'cancelled-sale',
      date: '2026-11-10',
      createdAt: now.toISOString(),
      storeId: 's1',
      status: 'CANCELLED',
      items: [{ productId: 'p1', quantity: 100 }]
    }],
    orders: [{
      id: 'draft-order',
      orderNumber: 'OC-2',
      supplierId: 'supplier1',
      supplierName: 'Proveedor',
      supplierTaxId: '123',
      date: '2026-11-01',
      status: 'DRAFT',
      items: [{ productId: 'p1', quantity: 2 }],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      currency: 'S/.',
      createdBy: 'test',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }],
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 2 }],
    transfers: [{
      id: 'tr1',
      guideNumber: 'TRS-1',
      verificationNumber: '01',
      productId: 'p1',
      fromStoreId: 'main',
      toStoreId: 's1',
      quantity: 2,
      createdBy: 'test',
      status: 'IN_TRANSIT',
      createdAt: now.toISOString()
    }]
  });

  assert.equal(suggestions.length, 0);
});

test('does not count received or cancelled purchase orders as incoming stock', () => {
  const makeOrder = (id, status) => ({
    id,
    orderNumber: `OC-${id}`,
    supplierId: 'supplier1',
    supplierName: 'Proveedor',
    supplierTaxId: '123',
    date: '2026-11-01',
    status,
    items: [{ productId: 'p1', quantity: 100 }],
    subtotal: 0,
    taxTotal: 0,
    total: 0,
    currency: 'S/.',
    createdBy: 'test',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  });

  const suggestions = getSuggestions({
    products: [{ ...product, stock: 0 }],
    orders: [makeOrder('received', 'RECEIVED'), makeOrder('cancelled', 'CANCELLED')],
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 4 }]
  });

  assert.equal(suggestions[0].requestedQuantity, 10);
});
