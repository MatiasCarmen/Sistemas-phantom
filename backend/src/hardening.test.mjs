import test from 'node:test';
import assert from 'node:assert/strict';
import { pgString, mysqlString, sqlNumber } from './sqlEscape.ts';
import { priceLineItems } from './pricing.ts';

process.env.JWT_SECRET = 'secreto-de-pruebas-unitarias-con-mas-de-32-caracteres';
const { chainAuditEvents, verifyAuditChain } = await import('./audit.ts');

test('sqlEscape neutraliza intentos de inyección en los scripts exportados (A05)', () => {
  const payload = "X'); DROP TABLE nexus_users; -- \\";
  assert.equal(pgString(payload), "'X''); DROP TABLE nexus_users; -- \\'");
  assert.equal(mysqlString(payload), "'X\\'); DROP TABLE nexus_users; -- \\\\'");
  assert.equal(mysqlString('linea1\nlinea2\0'), "'linea1\\nlinea2\\0'");
  assert.equal(sqlNumber('1; DROP TABLE x'), '0');
  assert.equal(sqlNumber(12.5), '12.5');
});

test('priceLineItems ignora precios del cliente y usa el catálogo (A06/A08)', () => {
  const catalog = { 'prod-1': { id: 'prod-1', sku: 'SKU1', name: 'Consola', unit: 'UND', sellingPrice: 118, costPrice: 80 } };
  const priced = priceLineItems([{ productId: 'prod-1', quantity: 2, discountPercent: 10, unitPrice: 0.01 }], (id) => catalog[id], 18);
  assert.equal(priced.items[0].unitPrice, 118);
  assert.equal(priced.items[0].costPrice, 80);
  assert.equal(priced.total, 212.4);
  assert.equal(priced.subtotal, 180);
  assert.equal(priced.taxTotal, 32.4);

  const missing = priceLineItems([{ productId: 'no-existe', quantity: 1, discountPercent: 0 }], (id) => catalog[id], 18);
  assert.ok('error' in missing);
});

test('la cadena HMAC de la bitácora detecta eventos alterados o eliminados (A09)', () => {
  const base = { method: 'POST', route: '/api/x', ipAddress: '127.0.0.1', actorId: 'usr-admin', actorName: 'Admin', entity: 'Producto' };
  const events = [1, 2, 3].map((n) => ({ ...base, id: `evt-${n}`, occurredAt: `2026-10-18T10:00:0${n}.000Z`, action: 'update', entityId: `prod-${n}` }));
  chainAuditEvents(events, undefined);
  assert.deepEqual(verifyAuditChain(events), { valid: true, checked: 3 });

  const edited = structuredClone(events);
  edited[1].actorName = 'Otra persona';
  assert.equal(verifyAuditChain(edited).valid, false);
  assert.equal(verifyAuditChain(edited).brokenAt, 'evt-2');

  const removed = [events[0], events[2]];
  assert.equal(verifyAuditChain(removed).valid, false);
});
