import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextSaleNumber, getStoreSeriesNumber } from './saleNumbering.ts';

test('generates independent invoice series for each store', () => {
  const sales = [
    { saleNumber: 'FAC01-00000001' },
    { saleNumber: 'FAC01-00000003' },
    { saleNumber: 'FAC02-00000008' },
    { saleNumber: 'FAC-00000099' }
  ];

  assert.equal(getNextSaleNumber(sales, '01', 'FACTURA'), 'FAC01-00000004');
  assert.equal(getNextSaleNumber(sales, '02', 'FACTURA'), 'FAC02-00000009');
  assert.equal(getNextSaleNumber(sales, '03', 'FACTURA'), 'FAC03-00000001');
});

test('generates separate series by voucher type', () => {
  const sales = [
    { saleNumber: 'FAC01-00000002' },
    { saleNumber: 'BOL01-00000004' }
  ];

  assert.equal(getNextSaleNumber(sales, '01', 'BOLETA'), 'BOL01-00000005');
  assert.equal(getNextSaleNumber(sales, '01', 'FACTURA'), 'FAC01-00000003');
});

test('uses the fixed receipt series for each store', () => {
  const stores = [
    { id: 'store-01', verificationNumber: '99', expected: '01' },
    { id: 'store-02', verificationNumber: '99', expected: '02' },
    { id: 'store-03', verificationNumber: '99', expected: '03' },
    { id: 'store-04', verificationNumber: '99', expected: '04' },
    { id: 'store-05', verificationNumber: '99', expected: '05' },
    { id: 'store-06', verificationNumber: '99', expected: '06' },
    { id: 'store-07', verificationNumber: '99', expected: '07' },
    { id: 'store-08', verificationNumber: '99', expected: '08' }
  ];

  for (const { id, verificationNumber, expected } of stores) {
    assert.equal(getStoreSeriesNumber({ id, verificationNumber }), expected);
    assert.equal(getNextSaleNumber([], expected, 'FACTURA'), `FAC${expected}-00000001`);
    assert.equal(getNextSaleNumber([], expected, 'BOLETA'), `BOL${expected}-00000001`);
  }
});
