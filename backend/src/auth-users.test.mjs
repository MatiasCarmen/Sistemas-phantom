import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHmac } from 'node:crypto';
import { MongoClient } from 'mongodb';

const databaseName = `phantom_security_${randomUUID().replaceAll('-', '')}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-security-'));
process.env.MONGODB_DATABASE = databaseName;
process.env.PHANTOM_DATA_DIR = dataDir;
process.env.JWT_SECRET = randomUUID() + randomUUID();
const { db } = await import('./dataStore.ts');
const { createApp } = await import('./app.ts');
const { hashPassword, signAuthToken } = await import('./security.ts');
const { PERMISSION_KEYS } = await import('../../shared/userValidation.ts');
const permissions = Object.fromEntries(PERMISSION_KEYS.map(key => [key, true]));
const password = 'SyntheticPassword2026!';
const makeUser = (id, overrides = {}) => ({
  id, username: id, name: 'Usuario de prueba', email: `${id}@example.test`, role: 'collaborator',
  roleLabel: 'Ejecutivo Comercial', status: 'active', permissions: { ...permissions },
  password: hashPassword(password), createdAt: new Date().toISOString(), ...overrides
});
let server;
let mongo;
let base;
let adminToken;
const isolatedServers = [];

async function request(url, { token = adminToken, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${url}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

before(async () => {
  assert.match(databaseName, /^phantom_security_[a-f0-9]{32}$/);
  mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 3000 });
  await mongo.connect();
  const snapshot = structuredClone(db.exportDatabase());
  snapshot.users = [
    makeUser('security-admin', { role: 'admin', roleLabel: 'Administrador' }),
    makeUser('security-inactive', { status: 'inactive' }),
    makeUser('security-missing', { password: undefined }),
    makeUser('security-legacy', { password }),
    makeUser('security-worker'),
    makeUser('security-inactive-admin', { role: 'admin', status: 'inactive' })
  ];
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(snapshot));
  await db.initialize();
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  adminToken = signAuthToken(db.getUserById('security-admin'));
});

after(async () => {
  for (const instance of [server, ...isolatedServers]) {
    if (instance) await new Promise(resolve => instance.close(resolve));
  }
  await db.close();
  if (mongo) {
    assert.match(databaseName, /^phantom_security_[a-f0-9]{32}$/);
    await mongo.db(databaseName).dropDatabase();
    assert.equal((await mongo.db(databaseName).listCollections().toArray()).length, 0);
    console.info(`[security-tests] Base temporal eliminada: ${databaseName}`);
    await mongo.close();
  }
  assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep));
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('login válido con scrypt y legado sin cambiar contraseñas existentes', async () => {
  for (const username of ['security-admin', 'security-legacy']) {
    const stored = db.getUserById(username).password;
    const result = await request('/auth/login', { token: null, method: 'POST', body: { username, password } });
    assert.equal(result.status, 200);
    assert.equal('password' in result.body.user, false);
    assert.ok(db.getUserById(username).password === stored);
    const me = await request('/auth/me', { token: result.body.token });
    assert.equal(me.status, 200);
  }
});

test('login inválido, ausente e inactivo usan la misma respuesta genérica', async () => {
  for (const body of [
    { username: 'security-admin', password: 'wrong' },
    { username: 'unknown', password },
    { username: 'security-missing', password },
    { username: 'security-inactive', password },
    { username: 'security-admin' },
    { username: {}, password }
  ]) {
    const result = await request('/auth/login', { token: null, method: 'POST', body });
    assert.equal(result.status, 401);
    assert.equal(result.body.error, 'Credenciales inválidas');
  }
});

test('usuarios inactivos no acceden a me ni endpoints protegidos', async () => {
  const token = signAuthToken(db.getUserById('security-inactive'));
  assert.equal((await request('/auth/me', { token })).status, 401);
  assert.equal((await request('/products', { token })).status, 401);
});

test('logout revoca una sesión y conserva las demás', async () => {
  const user = db.getUserById('security-worker');
  const first = signAuthToken(user);
  const second = signAuthToken(user);
  assert.equal((await request('/auth/logout', { token: first, method: 'POST' })).status, 200);
  assert.equal((await request('/auth/me', { token: first })).status, 401);
  assert.equal((await request('/products', { token: first })).status, 401);
  assert.equal((await request('/auth/me', { token: second })).status, 200);
});

test('rechaza tokens manipulados, expirados y sesiones no registradas', async () => {
  const token = signAuthToken(db.getUserById('security-worker'));
  const [header, payload] = token.split('.');
  const resign = changes => {
    const encoded = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), ...changes })).toString('base64url');
    const signature = createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${encoded}`).digest('base64url');
    return `${header}.${encoded}.${signature}`;
  };
  for (const invalid of [token + 'tampered', resign({ exp: Math.floor(Date.now() / 1000) - 1 }), resign({ jti: randomUUID() })]) {
    assert.equal((await request('/auth/me', { token: invalid })).status, 401);
  }
  const forgedRole = resign({ role: 'admin' });
  assert.equal((await request('/users', { token: forgedRole })).status, 403);
});

test('valida datos, contraseñas, roles, estados y permisos al crear y editar', async () => {
  const valid = { username: 'new-security', name: 'Nueva persona', email: 'new-security@example.test', password, role: 'collaborator' };
  for (const changes of [
    { password: undefined }, { password: '123456' }, { email: 'invalid' }, { role: 'superuser' },
    { status: 'other' }, { permissions: { canManageUsers: 'true' } }, { permissions: [] }, { name: '' }
  ]) {
    assert.equal((await request('/users', { method: 'POST', body: { ...valid, ...changes } })).status, 400);
  }
  const created = await request('/users', { method: 'POST', body: valid });
  assert.equal(created.status, 201);
  assert.equal('password' in created.body.data, false);
  for (const changes of [{ email: 'invalid' }, { password: '' }, { role: 'superuser' }, { permissions: null }, { status: null }]) {
    assert.equal((await request(`/users/${created.body.data.id}`, { method: 'PUT', body: changes })).status, 400);
  }
  await db.flushPersistence();
  const stored = await mongo.db(databaseName).collection('users').findOne({ id: created.body.data.id });
  assert.ok(stored.password.startsWith('scrypt$'));
});

test('previene duplicados de username y email, incluso cruzados y con mayúsculas', async () => {
  const valid = { username: 'unique-security', name: 'Persona', email: 'unique@example.test', password, role: 'collaborator' };
  for (const changes of [{ username: 'SECURITY-ADMIN' }, { email: 'SECURITY-ADMIN@EXAMPLE.TEST' }, { username: 'security-admin@example.test' }]) {
    assert.equal((await request('/users', { method: 'POST', body: { ...valid, ...changes } })).status, 400);
  }
  assert.equal((await request('/users/security-worker', { method: 'PUT', body: { email: 'SECURITY-ADMIN@EXAMPLE.TEST' } })).status, 400);
});

test('mass assignment conserva campos internos y recalcula etiqueta de rol', async () => {
  const before = structuredClone(db.getUserById('security-worker'));
  const result = await request('/users/security-worker', { method: 'PUT', body: {
    id: 'injected', createdAt: 'injected', lastLogin: 'injected', sessionVersion: 999,
    authentication: { bypass: true }, roleLabel: 'injected', name: 'Nombre permitido'
  } });
  assert.equal(result.status, 200);
  const after = db.getUserById('security-worker');
  for (const field of ['id', 'createdAt', 'lastLogin', 'password']) assert.ok(after[field] === before[field]);
  assert.equal('sessionVersion' in after, false);
  assert.equal('authentication' in after, false);
  assert.equal(after.name, 'Nombre permitido');
  assert.equal(after.roleLabel, 'Ejecutivo Comercial');
});

test('no permite eliminar, degradar, desactivar ni quitar permisos esenciales al último administrador activo', async () => {
  assert.equal((await request('/users/security-admin', { method: 'DELETE' })).status, 400);
  for (const changes of [{ role: 'collaborator' }, { status: 'inactive' },
    ...['canManageUsers', 'canManageSettings', 'canDeleteRecords'].map(key => ({ permissions: { ...permissions, [key]: false } }))]) {
    assert.equal((await request('/users/security-admin', { method: 'PUT', body: changes })).status, 400);
  }
  assert.equal((await request('/auth/me')).status, 200);
});

test('desactivar revoca tokens incluso después de reactivar; contraseña, rol y permisos también revocan', async () => {
  for (const changes of [{ status: 'inactive' }, { password: 'ChangedPassword2026!' }, { role: 'warehouse' }, { permissions: { ...permissions, canViewCosts: false } }]) {
    const token = signAuthToken(db.getUserById('security-worker'));
    assert.equal((await request('/users/security-worker', { method: 'PUT', body: changes })).status, 200);
    assert.equal((await request('/users/security-worker', { method: 'PUT', body: { status: 'active' } })).status, 200);
    assert.equal((await request('/auth/me', { token })).status, 401);
  }
});

test('HTTP 429 después de diez intentos, sin confiar en X-Forwarded-For', async () => {
  const instance = createApp().listen(0, '127.0.0.1');
  isolatedServers.push(instance);
  await new Promise(resolve => instance.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${instance.address().port}/api/auth/login`;
  for (let index = 0; index < 11; index++) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `192.0.2.${index}` },
      body: JSON.stringify({ username: 'unknown', password: 'wrong' })
    });
    assert.equal(response.status, index < 10 ? 401 : 429);
    if (index === 10) assert.ok(Number(response.headers.get('retry-after')) > 0);
    await response.json();
  }
});

test('permite modificar y eliminar otro administrador mientras queda uno activo', async () => {
  const result = await request('/users', { method: 'POST', body: {
    username: 'second-security-admin', name: 'Segundo administrador', email: 'second-admin@example.test', password, role: 'admin'
  } });
  assert.equal(result.status, 201);
  const id = result.body.data.id;
  assert.equal((await request(`/users/${id}`, { method: 'PUT', body: { status: 'inactive' } })).status, 200);
  assert.equal((await request(`/users/${id}`, { method: 'PUT', body: { status: 'active', role: 'collaborator' } })).status, 200);
  assert.equal((await request(`/users/${id}`, { method: 'PUT', body: { role: 'admin' } })).status, 200);
  assert.equal((await request(`/users/${id}`, { method: 'DELETE' })).status, 200);
});
