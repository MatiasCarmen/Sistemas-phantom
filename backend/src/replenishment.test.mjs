import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReplenishmentSuggestions } from './replenishment.ts';

const now = new Date('2026-11-12T12:00:00.000Z');
const product = {
  id: 'p1',
  name: 'Producto',
  sku: 'SKU-1',
  unit: 'UND',
  stock: 20,
  minStock: 3,
  maxStock: 8
};
const store = { id: 's1', name: 'Tienda 1', type: 'STORE', status: 'ACTIVE' };

function getSuggestions(overrides = {}) {
  return buildReplenishmentSuggestions({
    products: [product],
    stores: [store],
    storeStock: [],
    transfers: [],
    sales: [],
    now,
    ...overrides
  });
}

test('suggests enough stock to reach max stock when below minimum', () => {
  const suggestions = getSuggestions({
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 2 }]
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].requestedQuantity, 6);
  assert.equal(suggestions[0].suggestedQuantity, 6);
});

test('counts recent sales in the target and subtracts stock in transit', () => {
  const suggestions = getSuggestions({
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 2 }],
    transfers: [{
      id: 'tr1',
      guideNumber: 'TRS-1',
      verificationNumber: '01',
      productId: 'p1',
      fromStoreId: 'main',
      toStoreId: 's1',
      quantity: 1,
      createdBy: 'test',
      status: 'IN_TRANSIT',
      createdAt: now.toISOString()
    }],
    sales: [{
      id: 'sale1',
      date: '2026-11-10',
      createdAt: now.toISOString(),
      storeId: 's1',
      status: 'COMPLETED',
      items: [{ productId: 'p1', quantity: 30 }]
    }]
  });

  assert.equal(suggestions[0].recentSales, 30);
  assert.equal(suggestions[0].targetStock, 8);
  assert.equal(suggestions[0].inTransitQuantity, 1);
  assert.equal(suggestions[0].requestedQuantity, 5);
});

test('does not suggest duplicate stock and does not exceed central availability', () => {
  const suggestions = getSuggestions({
    products: [{ ...product, stock: 2 }],
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 1 }]
  });

  assert.equal(suggestions[0].requestedQuantity, 7);
  assert.equal(suggestions[0].suggestedQuantity, 2);

  const noDuplicate = getSuggestions({
    storeStock: [{ storeId: 's1', productId: 'p1', quantity: 3 }],
    transfers: [{
      id: 'tr1',
      guideNumber: 'TRS-1',
      verificationNumber: '01',
      productId: 'p1',
      fromStoreId: 'main',
      toStoreId: 's1',
      quantity: 1,
      createdBy: 'test',
      status: 'IN_TRANSIT',
      createdAt: now.toISOString()
    }]
  });

  assert.equal(noDuplicate.length, 0);
});

test('allocates shared central stock across stores without overpromising', () => {
  const suggestions = getSuggestions({
    products: [{ ...product, stock: 5 }],
    stores: [store, { ...store, id: 's2', name: 'Tienda 2' }],
    storeStock: [
      { storeId: 's1', productId: 'p1', quantity: 1 },
      { storeId: 's2', productId: 'p1', quantity: 1 }
    ]
  });

  assert.deepEqual(suggestions.map(item => item.suggestedQuantity), [5, 0]);
  assert.equal(suggestions.reduce((sum, item) => sum + item.suggestedQuantity, 0), 5);
});

test('ignores cancelled sales and inactive stores', () => {
  const suggestions = getSuggestions({
    stores: [store, { ...store, id: 's2', status: 'INACTIVE' }],
    sales: [{
      id: 'sale1',
      date: '2026-11-10',
      createdAt: now.toISOString(),
      storeId: 's1',
      status: 'CANCELLED',
      items: [{ productId: 'p1', quantity: 100 }]
    }]
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].recentSales, 0);
});
