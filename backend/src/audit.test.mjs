import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuditEvents } from './audit.ts';

const emptySnapshot = () => ({
  products: [],
  categories: [],
  suppliers: [],
  customers: [],
  inventoryMovements: [],
  quotes: [],
  sales: [],
  users: [],
  settings: {},
  lastUpdated: '2026-10-06T00:00:00.000Z'
});

const actor = { id: 'usr-admin', name: 'Administrador' };
const request = { method: 'POST', path: '/api/products', ip: '127.0.0.1' };

test('registra creación, modificación y eliminación con valores anteriores y nuevos', () => {
  const original = emptySnapshot();
  const created = structuredClone(original);
  created.products.push({ id: 'prod-1', name: 'Teclado' });

  const createEvent = buildAuditEvents(original, created, actor, request)[0];
  assert.equal(createEvent.action, 'create');
  assert.equal(createEvent.entity, 'Producto');
  assert.equal(createEvent.entityId, 'prod-1');
  assert.equal(createEvent.after.name, 'Teclado');

  const modified = structuredClone(created);
  modified.products[0].name = 'Teclado mecánico';
  const updateEvent = buildAuditEvents(created, modified, actor, request)[0];
  assert.equal(updateEvent.action, 'update');
  assert.equal(updateEvent.before.name, 'Teclado');
  assert.equal(updateEvent.after.name, 'Teclado mecánico');

  const deleteEvent = buildAuditEvents(modified, original, actor, request)[0];
  assert.equal(deleteEvent.action, 'delete');
  assert.equal(deleteEvent.before.name, 'Teclado mecánico');
  assert.equal(deleteEvent.after, undefined);
});

test('redacta contraseñas y tokens en los valores auditados', () => {
  const before = emptySnapshot();
  const after = structuredClone(before);
  after.users.push({ id: 'usr-2', name: 'Operador', password: 'plain-password', accessToken: 'private-token' });

  const event = buildAuditEvents(before, after, actor, request)[0];
  assert.equal(event.after.password, '[REDACTADO]');
  assert.equal(event.after.accessToken, '[REDACTADO]');
});